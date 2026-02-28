import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vueRouter from "vue-router";

vi.mock("./monteCarlo.worker.js?worker", () => {
  return {
    default: class MockWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
      }
      postMessage() {
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({
              data: {
                type: "success",
                result: {
                  successRate: 0.5,
                  p10: 1,
                  p50: 2,
                  p90: 3,
                  terminalDepletionPlan: { recommendedFireMonth: 60 },
                },
              },
            });
          }
        }, 0);
      }
      terminate() {}
    },
  };
});

vi.mock("@/domain/fire", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateGrowthTable: () => ({ fireReachedMonth: 12, table: [{ month: 12, assets: 777 }] }),
    generateAnnualSimulation: () => [{ age: 40, income: 10, pension: 2, expenses: 3, investmentGain: 4, withdrawal: 5, assets: 6, cashAssets: 7, riskAssets: 8 }],
    runMonteCarloSimulation: () => ({ successRate: 0.5, p10: 1, p50: 2, p90: 3, trials: 100 }),
    findFireMonthForMedianDepletion: () => ({ recommendedFireMonth: 60, p50TerminalAssets: 10000, successRate: 0.8, iterations: 6, boundaryHit: null, evaluation: {} }),
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
    expect(vm.pensionAnnualAtFire.value).toBeGreaterThan(0);

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


  it("uses basicReduction=1.0 when URL pensionConfig is present but basicReduction is missing", async () => {
    const { encode } = await import("@/domain/fire/url");
    const encoded = encode({ pc: { earlyReduction: 0.76 } });

    vi.spyOn(vueRouter, "useRoute").mockReturnValue({
      params: { p: encoded },
      query: {},
    });

    const vm = useFireSimulatorViewModel();
    expect(vm.pensionConfig.value.basicReduction).toBe(1.0);
  });


  it("uses age-based earlyReduction when URL pensionConfig is present but earlyReduction is missing", async () => {
    const { encode } = await import("@/domain/fire/url");
    const encoded = encode({ pc: { userStartAge: 65 } });

    vi.spyOn(vueRouter, "useRoute").mockReturnValue({
      params: { p: encoded },
      query: {},
    });

    const vm = useFireSimulatorViewModel();
    expect(vm.pensionConfig.value.earlyReduction).toBe(1.0);
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

  it("persists monteCarloTargetSuccessRate in the compressed URL state", async () => {
    const replaceMock = vi.fn();
    vi.spyOn(vueRouter, "useRouter").mockReturnValue({
      replace: replaceMock,
    });
    vi.spyOn(vueRouter, "useRoute").mockReturnValue({
      params: {},
      query: {},
    });

    const vm = useFireSimulatorViewModel();
    vm.monteCarloTargetSuccessRate.value = 85;
    await nextTick();

    const callArgs = replaceMock.mock.calls[0][0];
    const { decode } = await import("@/domain/fire/url");
    expect(decode(callArgs.params.p).mctsr).toBe(85);
  });

  it("restores monteCarloTargetSuccessRate from the compressed URL state", async () => {
    const { encode } = await import("@/domain/fire/url");
    const encoded = encode({ mctsr: 92 });

    vi.spyOn(vueRouter, "useRoute").mockReturnValue({
      params: { p: encoded },
      query: {},
    });

    const vm = useFireSimulatorViewModel();
    expect(vm.monteCarloTargetSuccessRate.value).toBe(92);
  });


  it("supports multiple dependent birth dates", async () => {
    const { encode } = await import("@/domain/fire/url");
    const encoded = encode({ dbds: ["2018-01-01"] });

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
    vm.monteCarloTargetSuccessRate.value = 40;
    vm.runMonteCarlo();
    await vi.runAllTimersAsync();
    expect(vm.monteCarloResults.value.successRate).toBe(0.5);
    expect(vm.monteCarloResults.value.terminalDepletionPlan?.recommendedFireMonth).toBe(60);

    vm.useMonteCarlo.value = false;
    vm.runMonteCarlo();
    await nextTick();
    expect(vm.monteCarloResults.value).toBeNull();
  });


  it("includes terminal depletion guide fields in copied conditions JSON", async () => {
    const vm = useFireSimulatorViewModel();
    vm.useMonteCarlo.value = true;
    vm.runMonteCarlo();
    await vi.runAllTimersAsync();

    const payload = JSON.parse(vm.copyConditionsAndAlgorithm());
    expect(payload.monteCarloSimulation.results.terminalDepletionGuide.recommendedFireMonth).toBe(60);
    expect(payload.monteCarloSimulation.results.terminalDepletionGuide.recommendedFireAge).toBeDefined();
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

  describe("microCorpLink", () => {
    it("generates dynamic link with Spouse (1) and Child (1) for family", async () => {
      const vm = useFireSimulatorViewModel();
      vm.householdType.value = "family";
      vm.dependentBirthDates.value = ["2012-09-09"];
      await nextTick();

      const { decode } = await import("@/domain/fire/url");
      const encoded = vm.microCorpLink.value.split("/").pop();
      const decoded = decode(encoded);

      expect(decoded.dependents).toBe(2); // 1 Spouse + 1 Child
    });

    it("ignores empty child birth dates when counting dependents", async () => {
      const vm = useFireSimulatorViewModel();
      vm.householdType.value = "family";
      vm.dependentBirthDates.value = ["2012-09-09", "", null];
      await nextTick();

      const { decode } = await import("@/domain/fire/url");
      const encoded = vm.microCorpLink.value.split("/").pop();
      const decoded = decode(encoded);

      expect(decoded.dependents).toBe(2); // 1 Spouse + 1 valid Child
    });

    it("generates dynamic link with 0 dependents for single", async () => {
      const vm = useFireSimulatorViewModel();
      vm.householdType.value = "single";
      await nextTick();

      const { decode } = await import("@/domain/fire/url");
      const encoded = vm.microCorpLink.value.split("/").pop();
      const decoded = decode(encoded);

      expect(decoded.dependents).toBe(0);
    });

    it("generates dynamic link with 1 dependent for couple", async () => {
      const vm = useFireSimulatorViewModel();
      vm.householdType.value = "couple";
      await nextTick();

      const { decode } = await import("@/domain/fire/url");
      const encoded = vm.microCorpLink.value.split("/").pop();
      const decoded = decode(encoded);

      expect(decoded.dependents).toBe(1);
    });


    it("does not include bonus in micro-corp payload when bonus is disabled", async () => {
      const vm = useFireSimulatorViewModel();
      vm.includeBonus.value = false;
      vm.manualRegularMonthlyIncome.value = 400000;
      vm.manualAnnualBonus.value = 1000000;
      await nextTick();

      const { decode } = await import("@/domain/fire/url");
      const encoded = vm.microCorpLink.value.split("/").pop();
      const decoded = decode(encoded);

      expect(decoded.taxableIncome).toBe(2959367);
    });
    it("estimates gross salary and taxable income accurately", async () => {
      const vm = useFireSimulatorViewModel();
      // default birth date is 1980, so currentAge >= 44.
      // Set to 400k net monthly, 1M net bonus
      vm.manualRegularMonthlyIncome.value = 400000;
      vm.isAnnualBonusManual.value = true;
      vm.manualAnnualBonus.value = 1000000;
      vm.householdType.value = "family";
      vm.dependentBirthDates.value = ["2012-09-09"];
      await nextTick();

      const { decode } = await import("@/domain/fire/url");
      const encoded = vm.microCorpLink.value.split("/").pop();
      const decoded = decode(encoded);

      // netMonthly = 400,000. isOver40 = true (1980 birth)
      // estimateGrossMonthly(400,000, true) = 400,000 / (0.80 - 0.01) = 400,000 / 0.79 = 506,329.1...
      // previousSalary = 506,329
      expect(decoded.previousSalary).toBe(506329);

      // estimateTaxableIncome(grossMonthly, 1,000,000)
      // grossMonthly = 506,329 (see previousSalary)
      // grossBonusAnnual = 1,000,000 / 0.8 = 1,250,000
      // grossAnnual = (506,329 * 12) + 1,250,000 = 7,325,948
      // salaryDeduction = 7,325,948 * 0.1 + 1,100,000 = 1,832,594.8
      // salaryIncome = 7,325,948 - 1,832,594.8 = 5,493,353.2
      // socialInsurance = 7,325,948 * 0.15 = 1,098,892.2
      // basicDeduction = 550,000
      // taxableIncome = 5,493,353.2 - 1,098,892.2 - 550,000 = 3,844,461
      expect(decoded.taxableIncome).toBe(3844462);
    });
  });
});
