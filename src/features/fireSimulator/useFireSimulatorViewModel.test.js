import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockData = ref({ cashFlow: [] });

vi.mock("@/composables/usePortfolioData", () => ({
  usePortfolioData: () => ({ data: mockData, loading: ref(false), error: ref(null) }),
}));

vi.mock("@/domain/fire", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    calculateFirePortfolio: () => ({ totalAssetsYen: 1000, riskAssetsYen: 700, cashAssetsYen: 300 }),
    getPast5MonthSummary: () => ({
      monthlyLivingExpenses: { average: 100, breakdown: [], averageSpecial: 0 },
      monthlyRegularIncome: { average: 200, breakdown: [] },
      annualBonus: { average: 120, breakdown: [] },
      monthCount: 5,
    }),
    estimateMortgageMonthlyPayment: () => 10,
    generateGrowthTable: () => ({ fireReachedMonth: 12, table: [{ month: 12, assets: 777 }] }),
    generateAnnualSimulation: () => [{ age: 40, income: 10, pension: 2, expenses: 3, investmentGain: 4, withdrawal: 5, assets: 6, cashAssets: 7, riskAssets: 8 }],
    runMonteCarloSimulation: () => ({ successRate: 0.5, p10: 1, p50: 2, p90: 3, trials: 100 }),
    calculateDaughterAssetsBreakdown: () => ({}),
    generateAlgorithmExplanationSegments: () => [{ value: "abc" }],
  };
});

import { useFireSimulatorViewModel } from "@/features/fireSimulator/useFireSimulatorViewModel";

describe("useFireSimulatorViewModel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockData.value = { cashFlow: [] };
  });

  it("derives key values and export text", async () => {
    const vm = useFireSimulatorViewModel();
    // Default is manual assets in the clone app
    expect(vm.firePortfolio.value.totalAssetsYen).toBe(25000000);

    vm.useManualAssets.value = false;
    await nextTick();

    expect(vm.firePortfolio.value.totalAssetsYen).toBe(1000);
    expect(vm.initialAssets.value).toBe(1000);

    vm.useAutoExpense.value = true;
    await nextTick();
    expect(vm.monthlyExpense.value).toBe(100);

    expect(vm.requiredAssetsAtFire.value).toBe(777);
    expect(vm.copyAnnualTable()).toContain("incomeWithPensionYen");
    expect(vm.copyConditionsAndAlgorithm()).toContain("pensionConfig");
  });

  it("runs monte carlo only when enabled and clears results when disabled", async () => {
    const vm = useFireSimulatorViewModel();
    vm.runMonteCarlo();
    expect(vm.monteCarloResults.value).toBeNull();

    vm.useMonteCarlo.value = true;
    vm.runMonteCarlo();
    vi.runAllTimers();
    expect(vm.monteCarloResults.value.successRate).toBe(0.5);

    vm.useMonteCarlo.value = false;
    vm.runMonteCarlo();
    await nextTick();
    expect(vm.monteCarloResults.value).toBeNull();
  });
});
