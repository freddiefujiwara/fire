import { describe, expect, it } from "vitest";
import { normalizePortfolio } from "./normalize";

describe("normalizePortfolio", () => {
  it("numeric strings are parsed and totals computed", () => {
    const api = {
      breakdown: [
        { category: "預金", amount_yen: "1,000", percentage: "50" },
        { category: "株式", amount_yen: "￥ 2,000", percentage: "50%" },
      ],
      "total-liability": [{ total_yen: "500" }],
      "breakdown-liability": [{ category: "カード", amount_yen: "500", percentage: "100" }],
    };

    const normalized = normalizePortfolio(api);

    expect(normalized.totals.assetsYen).toBe(3000);
    expect(normalized.totals.liabilitiesYen).toBe(500);
    expect(normalized.totals.netWorthYen).toBe(2500);
    expect(normalized.summary.assetsByClass[1].percentage).toBe(50);
  });

  it("missing keys are safe and holdings fallback to empty arrays", () => {
    const normalized = normalizePortfolio({});

    expect(normalized.totals.assetsYen).toBe(0);
    expect(normalized.totals.liabilitiesYen).toBe(0);
    expect(normalized.summary.assetsByClass).toEqual([]);
    expect(normalized.holdings.cashLike).toEqual([]);
    expect(normalized.holdings.stocks).toEqual([]);
    expect(normalized.holdings.liabilitiesDetail).toEqual([]);
  });


  it("keeps pension profit when value already exists", () => {
    const normalized = normalizePortfolio({
      details__portfolio_det_pns__t0: [{ 名称: "Corporate DC", 現在価値: "120000", 評価損益率: "20", 評価損益: "999" }],
    });

    expect(normalized.holdings.pensions[0]["評価損益"]).toBe("999");
  });

  it("does not derive pension profit when denominator becomes zero", () => {
    const normalized = normalizePortfolio({
      details__portfolio_det_pns__t0: [{ 名称: "Edge", 現在価値: "120000", 評価損益率: "-100" }],
    });

    expect(normalized.holdings.pensions[0]["評価損益"]).toBeUndefined();
  });

  it("derives pension profit from current value and profit rate", () => {
    const normalized = normalizePortfolio({
      details__portfolio_det_pns__t0: [{ 名称: "iDeCo", 現在価値: "120000", 評価損益率: "20" }],
    });

    expect(normalized.holdings.pensions[0]["評価損益"]).toBe("20000");
  });

  it("handles null or non-object in pensions array safely", () => {
    const api = {
      details__portfolio_det_pns__t0: [null, "not-an-object"],
    };
    const normalized = normalizePortfolio(api);
    expect(normalized.holdings.pensions[0]).toBeNull();
    expect(normalized.holdings.pensions[1]).toBe("not-an-object");
  });

  it("handles null api input", () => {
    const normalized = normalizePortfolio(null);
    expect(normalized.totals.assetsYen).toBe(0);
  });

  it("handles missing category in breakdown items", () => {
    const api = {
      breakdown: [{}],
      "breakdown-liability": [{}],
    };
    const normalized = normalizePortfolio(api);
    expect(normalized.summary.assetsByClass[0].name).toBe("");
    expect(normalized.summary.liabilitiesByCategory[0].category).toBe("");
  });

  it("normalizes cashFlow data including edge cases for branches", () => {
    const api = {
      mfcf: [
        { date: "2026-02-12", amount: -3000, currency: "JPY", name: "Shop", category: "Food", is_transfer: false },
        { date: null, amount: 1000, currency: null, name: null, category: null, is_transfer: true },
        {},
      ],
    };
    const normalized = normalizePortfolio(api);
    expect(normalized.cashFlow).toHaveLength(3);

    expect(normalized.cashFlow[0]).toEqual({
      date: "2026-02-12",
      amount: -3000,
      currency: "JPY",
      name: "Shop",
      category: "Food",
      isTransfer: false,
    });

    expect(normalized.cashFlow[1]).toEqual({
      date: "",
      amount: 1000,
      currency: "JPY",
      name: "",
      category: "",
      isTransfer: true,
    });

    expect(normalized.cashFlow[2]).toEqual({
      date: "",
      amount: 0,
      currency: "JPY",
      name: "",
      category: "",
      isTransfer: false,
    });
  });

});
