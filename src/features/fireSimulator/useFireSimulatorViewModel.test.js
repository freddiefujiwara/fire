import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vueRouter from "vue-router";

vi.mock("@/domain/fire", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateGrowthTable: () => ({ fireReachedMonth: 12, table: [{ month: 12, assets: 777 }] }),
    generateAnnualSimulation: () => [{ age: 40, income: 10, pension: 2, expenses: 3, investmentGain: 4, withdrawal: 5, assets: 6, cashAssets: 7, riskAssets: 8 }],
    runMonteCarloSimulation: () => ({ successRate: 0.5, p10: 1, p50: 2, p90: 3, trials: 100 }),
    generateAlgorithmExplanationSegments: () => [{ value: "abc" }],
  };
});

vi.mock("vue-router", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
    query: {},
  }),
}));

import { useFireSimulatorViewModel } from "@/features/fireSimulator/useFireSimulatorViewModel";

describe("useFireSimulatorViewModel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("derives key values and export text", async () => {
    const vm = useFireSimulatorViewModel();
    expect(vm.initialAssets.value).toBe(25000000);

    expect(vm.requiredAssetsAtFire.value).toBe(777);
    expect(vm.copyAnnualTable()).toContain("incomeWithPensionYen");
    expect(vm.copyConditionsAndAlgorithm()).toContain("pensionConfig");
    expect(vm.copyConditionsAndAlgorithm()).toContain("mortgageMonthlyPaymentYen");
  });

  it("initializes from URL if 'p' path parameter is present", async () => {
    const mockState = {
      ht: "single",
      mi: 555555,
    };
    const { encode } = await import("@/domain/fire/url");
    const encoded = encode(mockState);

    vi.spyOn(vueRouter, "useRoute").mockReturnValue({
      params: { p: encoded },
      query: {},
    });

    const vm = useFireSimulatorViewModel();
    expect(vm.householdType.value).toBe("single");
    expect(vm.monthlyInvestment.value).toBe(555555);
  });

  it("updates URL when state changes", async () => {
    const replaceMock = vi.fn();
    vi.spyOn(vueRouter, "useRouter").mockReturnValue({
      replace: replaceMock,
    });
    vi.spyOn(vueRouter, "useRoute").mockReturnValue({
      params: {},
      query: {},
    });

    const vm = useFireSimulatorViewModel();
    vm.monthlyInvestment.value = 999999;
    await nextTick();

    expect(replaceMock).toHaveBeenCalled();
    const callArgs = replaceMock.mock.calls[0][0];
    expect(callArgs.params.p).toBeDefined();
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
