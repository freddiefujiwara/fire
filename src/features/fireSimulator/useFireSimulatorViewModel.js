import { computed, ref, watch } from "vue";
import { formatYen } from "@/domain/format";
import {
  calculateAge,
  DEFAULT_USER_BIRTH_DATE,
  DEFAULT_SPOUSE_BIRTH_DATE,
  DEFAULT_DEPENDENT_BIRTH_DATE,
} from "@/domain/family";
import CopyButton from "@/components/CopyButton.vue";
import {
  generateGrowthTable,
  generateAnnualSimulation,
  calculateMonthlyPension,
  runMonteCarloSimulation,
  generateAlgorithmExplanationSegments,
  DEFAULT_PENSION_CONFIG,
} from "@/domain/fire";
import FireSimulationTable from "@/components/FireSimulationTable.vue";
import FireSimulationChart from "@/components/FireSimulationChart.vue";
import {
  createMortgageOptions,
  fireDate,
  formatMonths,
  buildAnnualTableJson,
  buildConditionsAndAlgorithmJson,
} from "@/features/fireSimulator/formatters";

export function useFireSimulatorViewModel() {
  // New Configuration State
  const householdType = ref("family"); // single, couple, family
  const userBirthDate = ref(DEFAULT_USER_BIRTH_DATE);
  const spouseBirthDate = ref(DEFAULT_SPOUSE_BIRTH_DATE);
  const dependentBirthDate = ref(DEFAULT_DEPENDENT_BIRTH_DATE);
  const independenceAge = ref(24);

  const pensionConfig = ref({ ...DEFAULT_PENSION_CONFIG });

  const manualInitialRiskAssets = ref(20000000);
  const manualInitialCashAssets = ref(5000000);

  // Original State
  const monthlyInvestment = ref(100000);
  const annualReturnRate = ref(5);
  const currentAge = computed(() => calculateAge(userBirthDate.value));
  const includeInflation = ref(true);
  const inflationRate = ref(2);
  const includeTax = ref(true);
  const taxRate = ref(20.315);
  const postFireExtraExpense = ref(60000);
  const retirementLumpSumAtFire = ref(5000000);
  const manualPostFireFirstYearExtraExpense = ref(0);
  const withdrawalRate = ref(4);
  const includeBonus = ref(true);

  const useMonteCarlo = ref(false);
  const monteCarloTrials = ref(1000);
  const monteCarloVolatility = ref(15);
  const monteCarloSeed = ref(123);

  const initialAssets = computed(() => manualInitialRiskAssets.value + manualInitialCashAssets.value);
  const riskAssets = computed(() => manualInitialRiskAssets.value);
  const cashAssets = computed(() => manualInitialCashAssets.value);

  const manualMonthlyExpense = ref(300000);
  const manualRegularMonthlyIncome = ref(400000);
  const manualAnnualBonus = ref(1000000);
  const mortgageMonthlyPayment = ref(0);
  const mortgagePayoffDate = ref("");

  const monthlyExpense = computed(() => manualMonthlyExpense.value);
  const regularMonthlyIncome = computed(() => manualRegularMonthlyIncome.value);
  const annualBonus = computed(() => (includeBonus.value ? manualAnnualBonus.value : 0));
  const monthlyIncome = computed(() => regularMonthlyIncome.value + annualBonus.value / 12);
  const annualInvestment = computed(() => monthlyInvestment.value * 12);
  const annualSavings = computed(() => Math.max(0, (monthlyIncome.value - monthlyExpense.value - monthlyInvestment.value) * 12));
  const monthsOfCash = computed(() => (monthlyExpense.value > 0 ? cashAssets.value / monthlyExpense.value : 0));

  const postFireFirstYearExtraExpense = computed(() => manualPostFireFirstYearExtraExpense.value);

  const simulationParams = computed(() => ({
    initialAssets: initialAssets.value,
    riskAssets: riskAssets.value,
    annualReturnRate: annualReturnRate.value / 100,
    monthlyExpense: monthlyExpense.value,
    monthlyIncome: monthlyIncome.value,
    currentAge: currentAge.value,
    includeInflation: includeInflation.value,
    inflationRate: inflationRate.value / 100,
    includeTax: includeTax.value,
    taxRate: taxRate.value / 100,
    withdrawalRate: withdrawalRate.value / 100,
    mortgageMonthlyPayment: mortgageMonthlyPayment.value,
    mortgagePayoffDate: mortgagePayoffDate.value || null,
    postFireExtraExpense: postFireExtraExpense.value,
    postFireFirstYearExtraExpense: postFireFirstYearExtraExpense.value,
    retirementLumpSumAtFire: retirementLumpSumAtFire.value,
    includePension: true,
    monthlyInvestment: monthlyInvestment.value,
    expenseBreakdown: null,
    pensionConfig: pensionConfig.value,
    dependentBirthDate: householdType.value === "family" ? dependentBirthDate.value : null,
    independenceAge: independenceAge.value,
  }));

  const growthData = computed(() => generateGrowthTable(simulationParams.value));
  const annualSimulationData = computed(() => generateAnnualSimulation(simulationParams.value));

  const fireAchievementMonth = computed(() => growthData.value.fireReachedMonth);
  const fireAchievementAge = computed(() => Math.floor(currentAge.value + fireAchievementMonth.value / 12));
  const pensionAnnualAtFire = computed(() => calculateMonthlyPension(60, fireAchievementAge.value, pensionConfig.value) * 12);
  const estimatedMonthlyPensionAt60 = computed(() => calculateMonthlyPension(60, fireAchievementAge.value, pensionConfig.value));

  const requiredAssetsAtFire = computed(() => {
    const fireMonth = fireAchievementMonth.value;
    if (fireMonth < 0 || fireMonth >= 1200) return 0;
    const firePoint = growthData.value.table.find((row) => row.month === fireMonth);
    return Math.round(firePoint?.assets ?? 0);
  });

  const mortgagePayoffAge = computed(() => {
    if (!mortgagePayoffDate.value) return null;
    const payoff = new Date(`${mortgagePayoffDate.value}-01`);
    return calculateAge(userBirthDate.value, payoff);
  });

  const daughterIndependenceAge = computed(() => {
      if (householdType.value !== "family" || !dependentBirthDate.value) return null;
      const birth = new Date(dependentBirthDate.value);
      return calculateAge(userBirthDate.value, new Date(birth.getFullYear() + independenceAge.value, 3, 1));
  });

  const chartAnnotations = computed(() => {
    const list = [];
    if (fireAchievementMonth.value > 0 && fireAchievementMonth.value < 1200) {
      list.push({ age: fireAchievementAge.value, label: "FIRE達成" });
    }
    list.push({ age: pensionConfig.value.userStartAge, label: "年金開始(本人)" });
    if (pensionConfig.value.includeSpouse && (householdType.value === "couple" || householdType.value === "family")) {
        list.push({ age: pensionConfig.value.spouseUserAgeStart, label: "年金開始(配偶者)" });
    }
    if (daughterIndependenceAge.value) {
      list.push({ age: daughterIndependenceAge.value, label: "子の独立" });
    }
    if (mortgagePayoffAge.value) {
      list.push({ age: mortgagePayoffAge.value, label: "ローン完済" });
    }
    return list;
  });

  const algorithmExplanationSegments = computed(() =>
    generateAlgorithmExplanationSegments({
      daughterBreakdown: null,
      fireAchievementAge: fireAchievementAge.value,
      pensionAnnualAtFire: pensionAnnualAtFire.value,
      withdrawalRatePct: withdrawalRate.value,
      postFireExtraExpenseMonthly: postFireExtraExpense.value,
      postFireFirstYearExtraExpense: postFireFirstYearExtraExpense.value,
      retirementLumpSumAtFire: retirementLumpSumAtFire.value,
      useMonteCarlo: useMonteCarlo.value,
      monteCarloTrials: monteCarloTrials.value,
      monteCarloVolatilityPct: monteCarloVolatility.value,
      userBirthDate: userBirthDate.value,
      dependentBirthDate: (householdType.value === "family") ? dependentBirthDate.value : null,
      independenceAge: independenceAge.value,
    }),
  );

  const algorithmExplanationFull = computed(() => algorithmExplanationSegments.value.map((seg) => seg.value).join(""));

  const monteCarloResults = ref(null);
  const isCalculatingMonteCarlo = ref(false);

  const runMonteCarlo = () => {
    if (!useMonteCarlo.value) {
      monteCarloResults.value = null;
      return;
    }
    isCalculatingMonteCarlo.value = true;
    setTimeout(() => {
      monteCarloResults.value = runMonteCarloSimulation(simulationParams.value, {
        trials: monteCarloTrials.value,
        annualVolatility: monteCarloVolatility.value / 100,
        seed: monteCarloSeed.value,
      });
      isCalculatingMonteCarlo.value = false;
    }, 10);
  };

  watch(useMonteCarlo, (val) => {
    if (!val) {
      monteCarloResults.value = null;
    }
  });

  const conditionsPayload = computed(() => ({
    householdType: householdType.value,
    totalFinancialAssetsYen: initialAssets.value,
    riskAssetsYen: riskAssets.value,
    cashAssetsYen: cashAssets.value,
    estimatedAnnualExpenseYen: monthlyExpense.value * 12,
    estimatedAnnualIncomeYen: monthlyIncome.value * 12,
    annualInvestmentYen: annualInvestment.value,
    annualSavingsYen: annualSavings.value,
    annualBonusYen: annualBonus.value,
    requiredAssetsAtFireYen: requiredAssetsAtFire.value,
    fireAchievementMonth: fireAchievementMonth.value,
    fireAchievementAge: fireAchievementAge.value,
    mortgagePayoffDate: mortgagePayoffDate.value || null,
    expectedAnnualReturnRatePercent: annualReturnRate.value,
    includeInflation: includeInflation.value,
    inflationRatePercent: inflationRate.value,
    includeTax: includeTax.value,
    taxRatePercent: taxRate.value,
    withdrawalRatePercent: withdrawalRate.value,
    postFireExtraExpenseMonthlyYen: postFireExtraExpense.value,
    postFireFirstYearExtraExpenseYen: postFireFirstYearExtraExpense.value,
    retirementLumpSumAtFireYen: retirementLumpSumAtFire.value,
    userBirthDate: userBirthDate.value,
    dependentBirthDate: dependentBirthDate.value,
    pensionConfig: pensionConfig.value,
  }));

  const copyConditionsAndAlgorithm = () =>
    JSON.stringify(
      buildConditionsAndAlgorithmJson({
        conditions: conditionsPayload.value,
        monteCarloResults: monteCarloResults.value,
        monteCarloVolatility: monteCarloVolatility.value,
        monteCarloSeed: monteCarloSeed.value,
        estimatedMonthlyPensionAt60: estimatedMonthlyPensionAt60.value,
        pensionAnnualAtFire: pensionAnnualAtFire.value,
        fireAchievementAge: fireAchievementAge.value,
        algorithmExplanation: algorithmExplanationFull.value,
      }),
      null,
      2,
    );

  const copyAnnualTable = () => JSON.stringify(buildAnnualTableJson(annualSimulationData.value), null, 2);

  return {
    formatYen,
    CopyButton,
    FireSimulationTable,
    FireSimulationChart,
    monthlyInvestment,
    annualReturnRate,
    currentAge,
    includeInflation,
    inflationRate,
    includeTax,
    taxRate,
    postFireExtraExpense,
    retirementLumpSumAtFire,
    manualPostFireFirstYearExtraExpense,
    withdrawalRate,
    includeBonus,
    useMonteCarlo,
    monteCarloTrials,
    monteCarloVolatility,
    monteCarloSeed,
    initialAssets,
    riskAssets,
    cashAssets,
    monthsOfCash,
    manualMonthlyExpense,
    manualRegularMonthlyIncome,
    manualAnnualBonus,
    annualBonus,
    mortgageMonthlyPayment,
    mortgagePayoffDate,
    monthlyExpense,
    monthlyIncome,
    annualInvestment,
    annualSavings,
    postFireFirstYearExtraExpense,
    growthData,
    annualSimulationData,
    fireAchievementMonth,
    fireAchievementAge,
    pensionAnnualAtFire,
    estimatedMonthlyPensionAt60,
    requiredAssetsAtFire,
    chartAnnotations,
    fireDate,
    formatMonths,
    isCalculatingMonteCarlo,
    runMonteCarlo,
    monteCarloResults,
    algorithmExplanationSegments,
    copyConditionsAndAlgorithm,
    copyAnnualTable,
    mortgageOptions: computed(() => createMortgageOptions()),
    // New exports
    householdType,
    userBirthDate,
    spouseBirthDate,
    dependentBirthDate,
    independenceAge,
    pensionConfig,
    manualInitialRiskAssets,
    manualInitialCashAssets,
  };
}
