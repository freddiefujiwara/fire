import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePortfolioStore } from "./portfolio";

function successResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

describe("portfolio store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(""),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it("loads live data when api request succeeds", async () => {
    const payload = {
      breakdown: [{ category: "預金", amount_yen: "1,000", percentage: "100" }],
      "total-liability": [{ total_yen: "200" }],
      "breakdown-liability": [{ category: "カード", amount_yen: "200", percentage: "100" }],
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse(payload)));

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    expect(store.loading).toBe(false);
    expect(store.error).toBe("");
    expect(store.source).toBe("live");
    expect(store.rawResponse).toEqual(payload);
    expect(store.data.totals.assetsYen).toBe(1000);
    expect(store.data.totals.liabilitiesYen).toBe(200);
  });

  it("loads cashFlow data when present in api response", async () => {
    const payload = {
      breakdown: [],
      mfcf: [
        { date: "2026-02-12", amount: -3000, currency: "JPY", name: "Shop", category: "Food", is_transfer: false }
      ]
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse(payload)));

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    expect(store.data.cashFlow).toHaveLength(1);
    expect(store.data.cashFlow[0].name).toBe("Shop");
  });

  it("sends token as query param when localStorage has google id token", async () => {
    globalThis.localStorage.getItem.mockReturnValue("token-123");
    const fetchMock = vi.fn().mockResolvedValue(successResponse({ breakdown: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("id_token=token-123");
  });

  it("uses direct token when passed to fetchPortfolio", async () => {
    globalThis.localStorage.getItem.mockReturnValue("");
    const fetchMock = vi.fn().mockResolvedValue(successResponse({ breakdown: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const store = usePortfolioStore();
    await store.fetchPortfolio("direct-token-456");

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("id_token=direct-token-456");
  });

  it("shows cors error and does not fallback to mock when request is blocked", async () => {
    globalThis.localStorage.getItem.mockReturnValue("token-123");
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.source).toBe("");
    expect(store.data).toBe(null);
    expect(store.error).toContain("CORS blocked API request");
  });

  it("does not fallback to mock on auth error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        successResponse({ status: 403, error: "forbidden email" }),
      ),
    );

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    expect(store.source).toBe("");
    expect(store.error).toContain("AUTH 403");
    expect(store.data).toBe(null);
    expect(store.loading).toBe(false);
  });

  it("does not retry automatically after terminal CORS error", async () => {
    globalThis.localStorage.getItem.mockReturnValue("token-123");
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const store = usePortfolioStore();
    await store.fetchPortfolio();
    await store.fetchPortfolio();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(store.error).toContain("CORS blocked API request");
  });


  it("shows guidance when GAS still expects bearer token", async () => {
    globalThis.localStorage.getItem.mockReturnValue("");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(successResponse({ status: 401, error: "missing id token" })),
    );

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    expect(store.source).toBe("");
    expect(store.data).toBe(null);
    expect(store.error).toContain("GAS must read e.parameter.id_token");
  });

  it("retries once when api returns missing id token even though token exists", async () => {
    globalThis.localStorage.getItem.mockReturnValue("token-123");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successResponse({ status: 401, error: "missing id token" }))
      .mockResolvedValueOnce(successResponse({ breakdown: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.error).toBe("");
    expect(store.source).toBe("live");
  });

  it("allows retry after auth error", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successResponse({ status: 403, error: "forbidden email" }))
      .mockResolvedValueOnce(successResponse({ breakdown: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const store = usePortfolioStore();
    await store.fetchPortfolio();
    await store.fetchPortfolio();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.source).toBe("live");
    expect(store.error).toBe("");
  });

  it("falls back to mock data when api request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    expect(store.loading).toBe(false);
    expect(store.source).toBe("mock");
    expect(store.error).toContain("network down");
    expect(store.error).toContain("fallback to mock");
    expect(store.rawResponse).toBeTruthy();
    expect(store.data).toBeTruthy();
    expect(Array.isArray(store.data.holdings.cashLike)).toBe(true);
  });

  it("falls back to mock data when api response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );

    const store = usePortfolioStore();
    await store.fetchPortfolio();

    expect(store.source).toBe("mock");
    expect(store.source).toBe("mock");
    expect(store.error).toContain("HTTP 503");
    expect(store.loading).toBe(false);
  });

  it("returns early if already loading", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Promise(() => {})); // never resolves
    vi.stubGlobal("fetch", fetchMock);

    const store = usePortfolioStore();
    const firstCall = store.fetchPortfolio();
    expect(store.loading).toBe(true);

    const secondCall = store.fetchPortfolio();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await secondCall;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles payload in data property", async () => {
    const payload = {
      data: {
        breakdown: [],
        "total-liability": [],
      }
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse(payload)));
    const store = usePortfolioStore();
    await store.fetchPortfolio();
    expect(store.source).toBe("live");
  });

  it("handles errors without message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue({})); // No .message
    const store = usePortfolioStore();
    await store.fetchPortfolio();
    expect(store.error).toContain("unknown error");
  });

  it("falls back to mock if Failed to Fetch occurs without token", async () => {
    globalThis.localStorage.getItem.mockReturnValue("");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const store = usePortfolioStore();
    await store.fetchPortfolio();
    expect(store.source).toBe("mock");
  });

  it("handles missing error field in auth response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(successResponse({ status: 401 })), // no error field
    );
    const store = usePortfolioStore();
    await store.fetchPortfolio();
    expect(store.error).toContain("unauthorized");
  });

  it("handles missing localStorage or null token safely", async () => {
    // Test ?? "" when getItem returns null
    globalThis.localStorage.getItem.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue(successResponse({ breakdown: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const store = usePortfolioStore();
    await store.fetchPortfolio();
    expect(fetchMock.mock.calls[0][0]).not.toContain("id_token=");

    // Test globalThis.localStorage?. fallback (by deleting it)
    const originalLocalStorage = globalThis.localStorage;
    delete globalThis.localStorage;
    try {
      // Need to re-create store or re-trigger buildApiUrlWithToken?
      // usePortfolioStore is already defined, but getGoogleIdToken is called inside actions
      await store.fetchPortfolio();
    } finally {
      globalThis.localStorage = originalLocalStorage;
    }
  });

  it("sets source to 'mock' and populates data when fetch fails without idToken", async () => {
    globalThis.localStorage.getItem.mockReturnValue("");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("API unreachable")));
    const store = usePortfolioStore();
    await store.fetchPortfolio();
    expect(store.source).toBe("mock");
    expect(store.data).not.toBeNull();
  });

});
