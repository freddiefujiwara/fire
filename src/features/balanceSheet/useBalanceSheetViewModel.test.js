import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeRef = { query: {} };
const replace = vi.fn();
const portfolioDataRef = ref(null);
const rawResponseRef = ref(null);

vi.mock("vue-router", () => ({
  useRoute: () => routeRef,
  useRouter: () => ({ replace }),
}));

vi.mock("@/composables/usePortfolioData", () => ({
  usePortfolioData: () => ({
    data: portfolioDataRef,
    loading: ref(false),
    error: ref(null),
    rawResponse: rawResponseRef,
  }),
}));

vi.mock("@/composables/useInitialHashRestore", () => ({
  useInitialHashRestore: vi.fn(),
}));

import { useBalanceSheetViewModel } from "@/features/balanceSheet/useBalanceSheetViewModel";

describe("useBalanceSheetViewModel", () => {
  beforeEach(() => {
    replace.mockClear();
    routeRef.query = {};
    portfolioDataRef.value = {
      holdings: {
        stocks: [{ "銘柄コード": "7203", "保有数": "10", "保有株数": "10", "評価額": "1000" }],
        funds: [],
        pensions: [],
        points: [],
        cashLike: [],
        liabilitiesDetail: [{ 種類: "住宅ローン", 残高: "100" }],
      },
    };
    rawResponseRef.value = { data: { breakdown: [1], mfcf: [2] } };
  });

  it("derives owner and supports owner selection", () => {
    routeRef.query = { owner: "wife", extra: "1" };
    const vm = useBalanceSheetViewModel();
    expect(vm.selectedOwner.value).toBe("wife");
    vm.selectOwner("all");
    expect(replace).toHaveBeenCalledWith({ query: { owner: "all", extra: "1" } });
  });

  it("builds mapped raw JSON and treemap URL", () => {
    const vm = useBalanceSheetViewModel();
    expect(vm.getMappedAssetStatusJson()).toContain("asset_breakdown");
    expect(vm.getMappedAssetStatusJson()).not.toContain("mfcf");
    expect(vm.stockTreemapUrl.value).toContain("portfolio-treemap");
  });
});
