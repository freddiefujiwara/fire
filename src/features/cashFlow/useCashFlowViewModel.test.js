import { ref } from "vue";
import { describe, expect, it, vi, beforeEach } from "vitest";

const dataRef = ref(null);
const rawResponseRef = ref(null);

vi.mock("@/composables/usePortfolioData", () => ({
  usePortfolioData: () => ({ data: dataRef, loading: ref(false), error: ref(null), rawResponse: rawResponseRef }),
}));

import { useCashFlowViewModel } from "@/features/cashFlow/useCashFlowViewModel";

describe("useCashFlowViewModel", () => {
  beforeEach(() => {
    dataRef.value = {
      cashFlow: [
        { date: "2025-01-01", amount: -1000, isTransfer: false, category: "食費", kind: "variable", type: "variable", largeCategory: "生活", smallCategory: "食費", name: "a" },
        { date: "2025-01-02", amount: 2000, isTransfer: false, category: "給与", kind: "income", type: "income", largeCategory: "収入", smallCategory: "給与", name: "b" },
      ],
    };
    rawResponseRef.value = { data: { mfcf: [{ date: "2025-01-01" }], any: 1 } };
  });

  it("provides filtered table and kpis", () => {
    const vm = useCashFlowViewModel();
    expect(vm.filteredCashFlow.value.length).toBeGreaterThan(0);
    expect(vm.kpis.value).toHaveProperty("income");
  });

  it("handles category select and mfcf export", () => {
    const vm = useCashFlowViewModel();
    vm.handleCategorySelect("生活/食費");
    expect(vm.largeCategoryFilter.value).toBe("生活");
    expect(vm.getMonthlyMfcfJson("2025-01")).toContain("2025-01-01");
  });
});
