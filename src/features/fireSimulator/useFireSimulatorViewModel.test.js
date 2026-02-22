import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
