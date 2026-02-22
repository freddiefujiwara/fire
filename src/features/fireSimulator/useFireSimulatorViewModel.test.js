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

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

import { useFireSimulatorViewModel } from "@/features/fireSimulator/useFireSimulatorViewModel";

describe("useFireSimulatorViewModel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();

    // Default mocks for navigator
    global.navigator.share = vi.fn().mockResolvedValue(undefined);
    global.navigator.canShare = vi.fn().mockReturnValue(false);
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


  it("supports multiple dependent birth dates and legacy dbd URL", async () => {
    const { encode } = await import("@/domain/fire/url");
    const encoded = encode({ dbd: "2018-01-01" });

    vi.spyOn(vueRouter, "useRoute").mockReturnValue({
      params: { p: encoded },
      query: {},
    });

    const vm = useFireSimulatorViewModel();
    expect(vm.dependentBirthDates.value).toEqual(["2018-01-01"]);

    vm.addDependentBirthDate();
    vm.addDependentBirthDate();
    vm.addDependentBirthDate();
    expect(vm.dependentBirthDates.value).toHaveLength(3);

    vm.removeDependentBirthDate(0);
    expect(vm.dependentBirthDates.value).toHaveLength(2);
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

  it("automatically updates bonus and extra expense when regular income changes unless manual flag is set", async () => {
    const vm = useFireSimulatorViewModel();
    vm.manualRegularMonthlyIncome.value = 500000;
    await nextTick();
    // DEFAULT_BONUS_RATIO = 2.5
    expect(vm.manualAnnualBonus.value).toBe(500000 * 2.5);

    // Annual income = 500,000 * 12 + 1,250,000 = 7,250,000
    // DEFAULT_FIRST_YEAR_EXTRA_EXPENSE_RATIO = 0.1
    // Extra = 725,000. Rounded to 10k: Math.round(725000 / 10000) * 10000 = 730000
    expect(vm.manualPostFireFirstYearExtraExpense.value).toBe(730000);

    // Set manual flag
    vm.isAnnualBonusManual.value = true;
    vm.manualAnnualBonus.value = 2000000;
    vm.manualRegularMonthlyIncome.value = 1000000;
    await nextTick();
    expect(vm.manualAnnualBonus.value).toBe(2000000); // Remained manual value
  });

  it("calls navigator.share when downloadAnnualTableCsv is called and sharing is supported", async () => {
    global.navigator.canShare = vi.fn().mockReturnValue(true);
    const shareSpy = vi.spyOn(navigator, "share");

    const vm = useFireSimulatorViewModel();
    await vm.downloadAnnualTableCsv();

    expect(shareSpy).toHaveBeenCalled();
  });

  it("falls back to traditional download when sharing is not supported", async () => {
    global.navigator.canShare = vi.fn().mockReturnValue(false);

    // We can't easily test the document.createElement('a') part in this environment without more effort,
    // but we can at least check it doesn't throw and maybe check URL.createObjectURL was called
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

    const vm = useFireSimulatorViewModel();
    // To avoid issues with document not being fully mocked or link.click() failing
    // we might need to mock document.createElement if it fails.

    // In Vitest with jsdom, document.createElement works.
    await vm.downloadAnnualTableCsv();

    expect(createObjectURLSpy).toHaveBeenCalled();
  });
});
