import { calculateMonthlyPension } from "@/domain/fire";

/**
 * Build month options for mortgage payoff selection.
 * @param {Date} [baseDate=new Date()] - First month shown in the option list.
 * @param {number} [months=420] - Number of months to generate after the first month.
 * @returns {{val: string, label: string}[]} Month option list for the UI.
 */
export function createMortgageOptions(baseDate = new Date(), months = 420) {
  const options = [];
  for (let i = 0; i <= months; i += 1) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ val, label });
  }
  return options;
}

/**
 * Convert a month count into a calendar date label.
 * @param {number} months - Number of months from the base date.
 * @param {Date} [baseDate=new Date()] - Start date used for the month offset.
 * @returns {string} Human readable FIRE date text.
 */
export function fireDate(months, baseDate = new Date()) {
  if (months >= 1200 || months < 0) return "未達成 (100年以上)";
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

/**
 * Convert months into a simple year and month text.
 * @param {number} months - Month count to format.
 * @returns {string} Formatted duration text.
 */
export function formatMonths(months) {
  if (months >= 1200 || months < 0) return "100年以上";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths}ヶ月`;
  return `${years}年${remainingMonths}ヶ月`;
}

/**
 * Build a JSON-friendly object that contains inputs, key results, and explanation text.
 * @param {{conditions: object, monteCarloResults: object|null, monteCarloVolatility: number, monteCarloSeed: number, estimatedMonthlyPensionAt60: number, pensionAnnualAtFire: number, pensionEstimateAge: number, fireAchievementAge: number, algorithmExplanation: string}} params - Data used for the export JSON.
 * @returns {object} Structured export object for copy and share actions.
 */
export function buildConditionsAndAlgorithmJson({
  conditions,
  monteCarloResults,
  monteCarloVolatility,
  monteCarloSeed,
  estimatedMonthlyPensionAtStartAge,
  pensionAnnualAtFire,
  pensionEstimateAge,
  fireAchievementAge,
  algorithmExplanation,
}) {
  const pensionConfig = conditions.pensionConfig;
  const {
    householdType,
    totalFinancialAssetsYen,
    riskAssetsYen,
    cashAssetsYen,
    estimatedAnnualExpenseYen,
    estimatedAnnualIncomeYen,
    annualInvestmentYen,
    annualSavingsYen,
    annualBonusYen,
    mortgageMonthlyPaymentYen,
    mortgagePayoffDate,
    includeInflation,
    inflationRatePercent,
    includeTax,
    taxRatePercent,
    expectedAnnualReturnRatePercent,
    withdrawalRatePercent,
    postFireExtraExpenseMonthlyYen,
    postFireFirstYearExtraExpenseYen,
    retirementLumpSumAtFireYen,
    userBirthDate,
    spouseBirthDate,
    dependentBirthDates,
    requiredAssetsAtFireYen,
    fireAchievementMonth,
    fireAchievementAge: fireAchievementAgeFromConditions,
    currentAge,
    simulationEndAge,
  } = conditions;

  const terminalDepletionPlan = monteCarloResults?.terminalDepletionPlan || null;
  const recommendedFireMonth = terminalDepletionPlan?.recommendedFireMonth ?? null;
  const recommendedFireAge = recommendedFireMonth === null || currentAge === undefined
    ? null
    : Math.floor(currentAge + recommendedFireMonth / 12);

  const monteCarloSimulation = monteCarloResults
    ? {
        enabled: true,
        trials: monteCarloResults.trials,
        annualVolatilityPercent: monteCarloVolatility,
        seed: monteCarloSeed,
        successRatePercent: Number((monteCarloResults.successRate * 100).toFixed(1)),
        terminalAssetsPercentilesYen: {
          p10Yen: monteCarloResults.p10,
          p50Yen: monteCarloResults.p50,
          p90Yen: monteCarloResults.p90,
        },
        terminalDepletionGuide: terminalDepletionPlan
          ? {
              simulationEndAge,
              recommendedFireMonth,
              recommendedFireAge,
              p50TerminalAssetsYen: terminalDepletionPlan.p50TerminalAssets,
              successRatePercent: Number((terminalDepletionPlan.successRate * 100).toFixed(1)),
              boundaryHit: terminalDepletionPlan.boundaryHit,
            }
          : null,
      }
    : {
        enabled: false,
        trials: null,
        annualVolatilityPercent: monteCarloVolatility,
        seed: monteCarloSeed,
        successRatePercent: null,
        terminalAssetsPercentilesYen: null,
        terminalDepletionGuide: null,
      };

  return {
    simulationInputs: {
      householdProfile: {
        householdType,
        userBirthDate,
        spouseBirthDate,
        dependentBirthDates,
      },
      portfolioAndCashflow: {
        totalFinancialAssetsYen,
        riskAssetsYen,
        cashAssetsYen,
        estimatedAnnualExpenseYen,
        estimatedAnnualIncomeYen,
        annualInvestmentYen,
        annualSavingsYen,
        annualBonusYen,
        mortgageMonthlyPaymentYen,
        mortgagePayoffDate,
      },
      simulationAssumptions: {
        expectedAnnualReturnRatePercent,
        includeInflation,
        inflationRatePercent,
        includeTax,
        taxRatePercent,
        withdrawalRatePercent,
      },
      postFirePlan: {
        postFireExtraExpenseMonthlyYen,
        postFireFirstYearExtraExpenseYen,
        retirementLumpSumAtFireYen,
      },
      pensionConfig,
    },
    keyResults: {
      fireTarget: {
        requiredAssetsAtFireYen,
        fireAchievementMonth,
        fireAchievementAge: fireAchievementAgeFromConditions,
      },
      pensionEstimates: {
        householdMonthlyAtStartAgeYen: estimatedMonthlyPensionAtStartAge,
        householdAnnualAtPensionEstimateAgeYen: pensionAnnualAtFire,
        pensionEstimateAge,
        spouseBasicMonthlyEquivalentYen: Math.round(pensionConfig.basicFullAnnualYen / 12),
        spouseBasicMonthlyAtPensionEstimateAgeYen:
          pensionConfig.includeSpouse && pensionEstimateAge >= pensionConfig.spouseUserAgeStart
            ? Math.round(pensionConfig.basicFullAnnualYen / 12)
            : 0,
        spousePensionStartWhenUserAge: pensionConfig.spouseUserAgeStart,
      },
    },
    monteCarloSimulation,
    algorithmExplanation,
  };
}

/**
 * Convert annual simulation rows into a compact JSON table.
 * @param {Array<object>} annualSimulationData - Annual rows from the simulation.
 * @returns {Array<object>} Converted annual table rows.
 */
export function buildAnnualTableJson(annualSimulationData) {
  return annualSimulationData.map((row) => ({
    age: row.age,
    incomeWithPensionYen: row.income + row.pension,
    expensesYen: row.expenses,
    investmentGainYen: row.investmentGain,
    withdrawalYen: row.withdrawal,
    totalAssetsYen: row.assets,
    savingsCashYen: row.cashAssets,
    riskAssetsYen: row.riskAssets,
  }));
}

/**
 * Create a CSV string from annual simulation rows.
 * @param {Array<object>} data - Annual simulation rows.
 * @returns {string} CSV text with a BOM at the start.
 */
export function generateCsv(data) {
  const headers = [
    "年齢",
    "収入 (年金込)",
    "支出",
    "運用益(当年分)",
    "取り崩し額",
    "金融資産(合計)",
    "貯金額",
    "リスク資産額"
  ];

  const rows = data.map(row => [
    `${row.age}歳`,
    row.income + row.pension,
    row.expenses,
    row.investmentGain,
    row.withdrawal,
    row.assets,
    row.cashAssets,
    row.riskAssets
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.join(","))
  ].join("\n");

  // Add BOM for Excel compatibility
  return "\uFEFF" + csvContent;
}
