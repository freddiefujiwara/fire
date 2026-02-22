import { calculateMonthlyPension } from "@/domain/fire";

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

export function fireDate(months, baseDate = new Date()) {
  if (months >= 1200 || months < 0) return "未達成 (100年以上)";
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function formatMonths(months) {
  if (months >= 1200 || months < 0) return "100年以上";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths}ヶ月`;
  return `${years}年${remainingMonths}ヶ月`;
}

export function buildConditionsAndAlgorithmJson({
  conditions,
  monteCarloResults,
  monteCarloVolatility,
  monteCarloSeed,
  estimatedMonthlyPensionAt60,
  pensionAnnualAtFire,
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
    dependentBirthDate,
    dependentBirthDates,
    requiredAssetsAtFireYen,
    fireAchievementMonth,
    fireAchievementAge: fireAchievementAgeFromConditions,
  } = conditions;

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
      }
    : {
        enabled: false,
        trials: null,
        annualVolatilityPercent: monteCarloVolatility,
        seed: monteCarloSeed,
        successRatePercent: null,
        terminalAssetsPercentilesYen: null,
      };

  return {
    simulationInputs: {
      householdProfile: {
        householdType,
        userBirthDate,
        dependentBirthDate,
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
        householdMonthlyAtUserAge60Yen: estimatedMonthlyPensionAt60,
        householdAnnualAtUserAge60Yen: pensionAnnualAtFire,
        userMonthlyAtAge60Yen: calculateMonthlyPension(60, fireAchievementAge, pensionConfig),
        spouseMonthlyAtUserAge62Yen: Math.round(pensionConfig.basicFullAnnualYen / 12),
        spousePensionStartWhenUserAge: pensionConfig.spouseUserAgeStart,
      },
    },
    monteCarloSimulation,
    algorithmExplanation,
  };
}

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
