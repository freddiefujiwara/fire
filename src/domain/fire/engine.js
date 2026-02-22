import { calculateMonthlyPension, DEFAULT_PENSION_CONFIG } from "./pension";
import { formatYen } from "../format";

export {
  calculateMonthlyPension,
  DEFAULT_PENSION_CONFIG,
};

/**
 * Create text segments that explain the FIRE algorithm.
 */
export function generateAlgorithmExplanationSegments(params) {
  const {
    fireAchievementAge,
    pensionAnnualAtFire,
    withdrawalRatePct,
    postFireExtraExpenseMonthly,
    postFireFirstYearExtraExpense,
    retirementLumpSumAtFire,
    useMonteCarlo,
    monteCarloTrials,
    monteCarloVolatilityPct,
    dependentBirthDate,
    dependentBirthDates,
    independenceAge,
    householdType,
  } = params;

  const segments = [
    { type: "text", value: "本シミュレーションは、設定された期待リターン・インフレ率・年金・ローン等のキャッシュフローに基づき、100歳時点で資産が残る最短リタイア年齢を算出しています。\n・必要資産目安は「FIRE達成年齢で退職して100歳まで資産が尽きない最小条件」を満たす達成時点の金融資産額と同じ定義です。\n" },
  ];

  segments.push(
    { type: "text", value: "・投資優先順位ルール: 生活防衛資金として現金を維持するため、毎月の投資額は「前月までの貯金残高 + 当月の収支剰余金」を上限として自動調整されます（貯金がマイナスにならないよう制限されます）。\n・FIRE達成後は追加投資を停止し、定期収入（給与・ボーナス等）もゼロになると仮定しています。\n・FIRE達成月には退職金（一括）として " },
    { type: "amount", value: formatYen(retirementLumpSumAtFire) },
    { type: "text", value: " が現金資産に加算されます。\n・FIRE達成後は、年間支出または資産の" },
    { type: "text", value: String(withdrawalRatePct) },
    { type: "text", value: "%（設定値）のいずれか大きい額を引き出すと仮定しています。余剰分は再投資されず現金に滞留します。\n\n■ 年金受給の見込みについて\n本シミュレーションでは、ご本人が" },
    { type: "text", value: String(fireAchievementAge) },
    { type: "text", value: "歳でFIREし、設定された開始年齢から年金を受給するシナリオを想定しています。\n・世帯受給額（概算）: 年額 " },
    { type: "amount", value: formatYen(pensionAnnualAtFire) },
    { type: "text", value: "（月額 " },
    { type: "amount", value: formatYen(Math.round(pensionAnnualAtFire / 12)) },
    { type: "text", value: "）\n・算定根拠:\n  - 入力された年金実績データに基づき、現在までの加入実績を反映。\n  - リタイアに伴う厚生年金加入期間の停止を考慮。\n  - 繰上げ受給等の減額率設定を反映。\n\n住宅ローンの完済月以降は、月間支出からローン返済額を自動的に差し引いてシミュレーションを継続します。\n" }
  );

  const familyDependentCount = householdType === "family"
    ? (Array.isArray(dependentBirthDates) && dependentBirthDates.length > 0 ? dependentBirthDates.length : (dependentBirthDate ? 1 : 0))
    : 0;

  if (familyDependentCount > 0) {
    const defaultReductionText = familyDependentCount === 1
      ? "0.8（約2割減）"
      : familyDependentCount === 2
        ? "1人目: 0.85 / 2人目: 0.70（最終的に約3割減）"
        : "1人目: 0.90 / 2人目: 0.80 / 3人目: 0.65（最終的に約3.5割減）";

    segments.push(
      { type: "text", value: `
■ 家族構成の変化（子の独立）について
子が独立する（${independenceAge}歳になる年度）以降は、非住宅ローン部分の生活費に減額係数を適用します。
・減額係数の決まり方:
  - 支出内訳がある場合: 食費・教養教育・通信費・衣服美容・日用品の減額ルールから、全体の加重係数を算出して適用
  - 支出内訳がない場合（family設定）: 既定値として ${defaultReductionText} を適用
・住宅ローン返済額は別建てで扱い、完済月までは固定額、完済後は0円として計算します。
` }
    );
  }

  if (useMonteCarlo) {
    segments.push(
      { type: "text", value: "\n■ 順序リスク評価（モンテカルロ法）について\n本シミュレーションでは " },
      { type: "text", value: String(monteCarloTrials) },
      { type: "text", value: " 回のランダム試行を行い、期待リターンにボラティリティ（年率 " },
      { type: "text", value: String(monteCarloVolatilityPct) },
      { type: "text", value: "%）を加味した収益率の変動が資産寿命に与える影響を評価しています。\n・リターン分布: 対数正規分布を仮定し、Box-Muller法を用いて月次の収益率を生成しています。\n・P50 (中央値): 試行結果のうち、上位から50%の位置にあるシナリオです。期待リターンに近い結果を示します。\n・P10 (下位10%): 試行結果のうち、下位10%（ワーストに近い）のシナリオです。不況が続いた場合の生存確認に利用します。\n・P90 (上位10%): 試行結果のうち、上位10%（好況）のシナリオです。\n" }
    );
  }

  segments.push(
    { type: "text", value: "\n■ 各項目の算出定義\n・収入 (年金込): 定期収入（給与等） + 年金受給額の合算です。\n・支出: (基本生活費 - 住宅ローン) × インフレ調整 + 住宅ローン(固定) + FIRE後追加支出（FIRE達成月より加算） + FIRE1年目特別支出\n・運用益: 当年中の運用リターン合計。月次複利で計算されます。\n・取り崩し額: 生活費の不足分、または「資産 × 取崩率」のいずれか大きい額を引き出します（税金考慮時は利益分のみグロスアップ）。\n・貯金額 (現金): 前年末残高 + 当年収支(収入 - 支出) - 当年投資額 + リスク資産からの補填（純額）\n・リスク資産額: 前年末残高 + 投資額 + 運用益 - 取崩額(グロス)\n\nFIRE後の追加支出（デフォルト" },
    { type: "amount", value: formatYen(postFireExtraExpenseMonthly) },
    { type: "text", value: "）は、国民年金、国民健康保険、固定資産税等を合算した目安値です。\n・リタイア1年目の特別支出: 前年所得に基づく社会保険料・住民税のスパイク分として、FIRE後12か月間にわたり年額 " },
    { type: "amount", value: formatYen(postFireFirstYearExtraExpense) },
    { type: "text", value: "（インフレ調整あり）が追加で計上されます。" }
  );

  return segments;
}

function calculateRequiredAssets({
  monthlyReturn,
  monthlyInflation,
  remainingMonths,
  taxRate,
  includeTax,
  currentAgeInSimulation,
  includePension = true,
  withdrawalRate = 0.04,
  pensionConfig,
  postFireFirstYearExtraExpense,
  m,
  precalculatedBaseExpenses,
  precalculatedExtraExpenses,
}) {
  if (remainingMonths <= 0) return 0;

  const r = monthlyReturn;
  const g = monthlyInflation;
  const w = withdrawalRate / 12;
  const t = includeTax ? taxRate : 0;

  let A = 0;
  for (let i = remainingMonths - 1; i >= 0; i--) {
    const age = currentAgeInSimulation + i / 12;
    const P = includePension ? calculateMonthlyPension(age, currentAgeInSimulation, pensionConfig) : 0;

    const baseE = precalculatedBaseExpenses[m + i] + precalculatedExtraExpenses[m + i];
    let spike = 0;
    if (i < 12) {
      spike = (postFireFirstYearExtraExpense / 12) * Math.pow(1 + g, m + i);
    }
    const E = baseE + spike;

    const W_expense = Math.max(0, E - P);
    const A_case1 = (A / (1 + r)) + W_expense / (1 - t);
    const A_case2 = (A / (1 + r) - (P / (1 - t))) / (1 - (w / (1 - t)));

    A = Math.max(A_case1, A_case2);
  }

  return Math.max(0, A);
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function calculateCurrentMonthlyExpense({
  baseMonthlyExpense,
  monthlyInflationRate,
  monthIndex,
  simulationStartDate,
  mortgageMonthlyPayment,
  mortgagePayoffDate,
  lifestyleReductionFactor = 1.0,
  independenceMonthKey,
  independenceMonthKeys = [],
  householdChildrenCount = 0,
}) {
  const mortgage = mortgageMonthlyPayment || 0;
  const nonMortgageExpense = Math.max(0, baseMonthlyExpense - mortgage);

  const currentDate = new Date(simulationStartDate);
  currentDate.setMonth(currentDate.getMonth() + monthIndex);
  const currentMonthKey = toMonthKey(currentDate);

  const keyList = independenceMonthKeys.length > 0 ? independenceMonthKeys : (independenceMonthKey ? [independenceMonthKey] : []);
  const independentChildrenCount = keyList.filter((key) => currentMonthKey >= key).length;

  let effectiveReduction = 1.0;
  if (householdChildrenCount <= 1) {
    effectiveReduction = independentChildrenCount > 0 ? lifestyleReductionFactor : 1.0;
  } else if (householdChildrenCount === 2) {
    const factors = [1.0, 0.85, 0.70];
    effectiveReduction = factors[Math.min(independentChildrenCount, 2)];
  } else {
    const factors = [1.0, 0.90, 0.80, 0.65];
    effectiveReduction = factors[Math.min(independentChildrenCount, 3)];
  }

  const inflatedNonMortgage = (nonMortgageExpense * effectiveReduction) * Math.pow(1 + monthlyInflationRate, monthIndex);

  if (!mortgage || !mortgagePayoffDate) {
    return inflatedNonMortgage + mortgage;
  }

  if (currentMonthKey > mortgagePayoffDate) {
    return inflatedNonMortgage;
  }

  return inflatedNonMortgage + mortgage;
}

export function calculateLifestyleReduction(breakdown) {
  if (!breakdown || !Array.isArray(breakdown) || breakdown.length === 0) {
    return 1.0;
  }

  const reductionRules = {
    "食費": 2 / 3,
    "教養・教育": 0,
    "通信費": 2 / 3,
    "衣服・美容": 2 / 3,
    "日用品": 2 / 3,
  };

  let originalTotal = 0;
  let reducedTotal = 0;

  breakdown.forEach((item) => {
    originalTotal += item.amount;
    const multiplier = reductionRules[item.name] ?? 1.0;
    reducedTotal += item.amount * multiplier;
  });

  if (originalTotal === 0) return 1.0;
  return reducedTotal / originalTotal;
}

function getIndependenceMonthKeys(dependentBirthDates = [], independenceAge = 24) {
  if (!Array.isArray(dependentBirthDates)) return [];
  return dependentBirthDates
    .map((birthDateValue) => {
      const birthDate = new Date(birthDateValue);
      if (isNaN(birthDate.getTime())) return null;
      const independenceDate = new Date(birthDate.getFullYear() + independenceAge, 3, 1);
      return toMonthKey(independenceDate);
    })
    .filter(Boolean)
    .sort();
}

export function normalizeFireParams(params) {
  if (!params) return normalizeFireParams({});
  const monthlyExpense = params.monthlyExpense ?? (params.monthlyExpenses ? params.monthlyExpenses / 12 : 0);
  return {
    initialAssets: Number(params.initialAssets ?? 0),
    riskAssets: Number(params.riskAssets ?? 0),
    annualReturnRate: Number(params.annualReturnRate ?? 0),
    monthlyExpense: Number(monthlyExpense),
    monthlyIncome: Number(params.monthlyIncome ?? 0),
    currentAge: Number(params.currentAge || 40),
    includeInflation: Boolean(params.includeInflation),
    inflationRate: Number(params.inflationRate ?? 0.02),
    includeTax: Boolean(params.includeTax),
    taxRate: Number(params.taxRate ?? 0.20315),
    withdrawalRate: Number(params.withdrawalRate ?? 0.04),
    mortgageMonthlyPayment: Number(params.mortgageMonthlyPayment ?? 0),
    mortgagePayoffDate: params.mortgagePayoffDate || null,
    postFireExtraExpense: Number(params.postFireExtraExpense ?? 0),
    postFireFirstYearExtraExpense: Number(params.postFireFirstYearExtraExpense ?? 0),
    retirementLumpSumAtFire: Number(params.retirementLumpSumAtFire ?? 5000000),
    includePension: Boolean(params.includePension),
    monthlyInvestment: Number(params.monthlyInvestment ?? 0),
    maxMonths: Number(params.maxMonths ?? 1200),
    expenseBreakdown: params.expenseBreakdown || null,
    pensionConfig: params.pensionConfig || DEFAULT_PENSION_CONFIG,
    dependentBirthDate: params.dependentBirthDate || null,
    dependentBirthDates: Array.isArray(params.dependentBirthDates)
      ? params.dependentBirthDates.filter(Boolean).slice(0, 3)
      : (params.dependentBirthDate ? [params.dependentBirthDate] : []),
    independenceAge: params.independenceAge || 24,
    householdType: params.householdType || "single",
  };
}

function _runCoreSimulation(params, { recordMonthly = false, fireMonth = -1, returnsArray = null, skipRequiredAssets = false } = {}) {
  const {
    initialAssets,
    riskAssets,
    annualReturnRate,
    monthlyExpense,
    monthlyIncome,
    currentAge,
    maxMonths,
    includeInflation,
    inflationRate,
    includeTax,
    taxRate,
    withdrawalRate,
    mortgageMonthlyPayment,
    mortgagePayoffDate,
    postFireExtraExpense,
    postFireFirstYearExtraExpense,
    retirementLumpSumAtFire,
    includePension,
    monthlyInvestment,
    pensionConfig,
    dependentBirthDate,
    dependentBirthDates,
    independenceAge,
    householdType,
  } = params;

  const monthlyExp = monthlyExpense;
  const monthlyReturnMean = Math.pow(1 + annualReturnRate, 1 / 12) - 1;
  const monthlyInflationRate = Math.pow(1 + (includeInflation ? inflationRate : 0), 1 / 12) - 1;
  const totalMonthsUntil100 = (100 - currentAge) * 12;
  const simulationStartDate = new Date();
  const fallbackDependentBirthDates = dependentBirthDate ? [dependentBirthDate] : [];
  const effectiveDependentBirthDates = (dependentBirthDates && dependentBirthDates.length > 0)
    ? dependentBirthDates
    : fallbackDependentBirthDates;
  const independenceMonthKeys = getIndependenceMonthKeys(effectiveDependentBirthDates, independenceAge);
  const householdChildrenCount = householdType === "family" ? effectiveDependentBirthDates.length : 0;

  let currentRisk = riskAssets;
  let currentCostBasis = riskAssets;
  let currentCash = initialAssets - riskAssets;
  let fireReachedMonth = fireMonth;
  const monthlyData = recordMonthly ? [] : null;

  const simulationLimit = totalMonthsUntil100;
  let lifestyleReductionFactor = calculateLifestyleReduction(params.expenseBreakdown);
  if (lifestyleReductionFactor === 1.0 && householdType === "family") {
    lifestyleReductionFactor = 0.8; // Default approx 20% reduction if no breakdown provided
  }

  const precalculatedBaseExpenses = [];
  const precalculatedExtraExpenses = [];
  for (let k = 0; k <= simulationLimit; k++) {
    const curMonthlyExp = calculateCurrentMonthlyExpense({
      baseMonthlyExpense: monthlyExp,
      monthlyInflationRate,
      monthIndex: k,
      simulationStartDate,
      mortgageMonthlyPayment,
      mortgagePayoffDate,
      lifestyleReductionFactor,
      independenceMonthKeys,
      householdChildrenCount,
    });
    const extraWithInf = postFireExtraExpense * Math.pow(1 + monthlyInflationRate, k);
    precalculatedBaseExpenses.push(curMonthlyExp);
    precalculatedExtraExpenses.push(extraWithInf);
  }

  for (let m = 0; m <= simulationLimit; m++) {
    const ageAtMonthM = currentAge + m / 12;
    const remainingMonths = Math.max(0, totalMonthsUntil100 - m);

    if (m === fireReachedMonth) {
      currentCash += retirementLumpSumAtFire;
    }

    let firstYearSpikeWithInf = 0;
    if (fireReachedMonth !== -1 && m >= fireReachedMonth && m < fireReachedMonth + 12) {
      firstYearSpikeWithInf = (postFireFirstYearExtraExpense / 12) * Math.pow(1 + monthlyInflationRate, m);
    }

    const assets = Math.max(0, currentCash + currentRisk);

    const isFire = fireReachedMonth !== -1 && m >= fireReachedMonth;
    const fireAgeAtMonthM = fireReachedMonth === -1 ? (currentAge + 100) : currentAge + fireReachedMonth / 12;
    const curPension = includePension ? calculateMonthlyPension(ageAtMonthM, fireAgeAtMonthM, pensionConfig) : 0;

    const monthlyIncomeVal = isFire ? 0 : monthlyIncome;
    const monthlyExpensesVal = precalculatedBaseExpenses[m] + (isFire ? precalculatedExtraExpenses[m] : 0) + firstYearSpikeWithInf;
    const incomeAvailable = monthlyIncomeVal + curPension;

    if (recordMonthly && m <= maxMonths) {
      const reqAssets = skipRequiredAssets ? 0 : calculateRequiredAssets({
        monthlyReturn: monthlyReturnMean,
        monthlyInflation: monthlyInflationRate,
        remainingMonths,
        taxRate,
        includeTax,
        currentAgeInSimulation: ageAtMonthM,
        includePension,
        withdrawalRate,
        pensionConfig,
        postFireFirstYearExtraExpense,
        m,
        precalculatedBaseExpenses,
        precalculatedExtraExpenses,
      });

      monthlyData.push({
        month: m,
        age: ageAtMonthM,
        assets,
        riskAssets: currentRisk,
        cashAssets: currentCash,
        requiredAssets: reqAssets,
        isFire,
        income: monthlyIncomeVal,
        pension: curPension,
        expenses: monthlyExpensesVal,
        investmentGain: 0,
        withdrawal: 0,
      });
    }

    if (m === totalMonthsUntil100) break;

    let monthlyWithdrawal = 0;
    let monthlyInvest = 0;
    let investmentGain = 0;
    const returnRate = returnsArray[m];

    if (!isFire) {
      const netFlow = incomeAvailable - monthlyExpensesVal;
      const cashAfterFlow = currentCash + netFlow;

      if (cashAfterFlow < 0) {
        const needed = Math.abs(cashAfterFlow);
        const gainRatio = currentRisk > 0 ? Math.max(0, (currentRisk - currentCostBasis) / currentRisk) : 0;
        const maxNetFromRisk = Math.max(0, currentRisk * (1 - (includeTax ? gainRatio * taxRate : 0)));
        const actualNetFromRisk = Math.min(needed, maxNetFromRisk);
        const grossFromRisk = actualNetFromRisk / (1 - (includeTax ? gainRatio * taxRate : 0));

        const costBasisWithdrawn = grossFromRisk * (1 - gainRatio);
        currentCostBasis -= costBasisWithdrawn;
        currentRisk -= grossFromRisk;
        currentRisk = Math.max(0, currentRisk);
        currentCostBasis = Math.max(0, currentCostBasis);

        currentCash = cashAfterFlow + actualNetFromRisk;
        monthlyWithdrawal = actualNetFromRisk > 0 ? grossFromRisk : 0;
      } else {
        monthlyInvest = Math.min(monthlyInvestment, cashAfterFlow);
        currentCash = cashAfterFlow - monthlyInvest;
        currentRisk += monthlyInvest;
        currentCostBasis += monthlyInvest;
        monthlyWithdrawal = 0;
      }
    } else {
      const targetWithdrawalFromAssets = (assets * withdrawalRate) / 12;
      const expenseShortfall = Math.max(0, monthlyExpensesVal - incomeAvailable);
      const netToTakeFromAssets = Math.max(expenseShortfall, targetWithdrawalFromAssets);

      const takenFromCash = Math.min(currentCash, netToTakeFromAssets);
      const remainingShortfall = netToTakeFromAssets - takenFromCash;

      const gainRatio = currentRisk > 0 ? Math.max(0, (currentRisk - currentCostBasis) / currentRisk) : 0;
      const maxNetFromRisk = Math.max(0, currentRisk * (1 - (includeTax ? gainRatio * taxRate : 0)));
      const actualNetFromRisk = Math.min(remainingShortfall, maxNetFromRisk);
      const grossFromRisk = actualNetFromRisk / (1 - (includeTax ? gainRatio * taxRate : 0));

      const costBasisWithdrawn = grossFromRisk * (1 - gainRatio);
      currentCostBasis -= costBasisWithdrawn;
      currentRisk -= grossFromRisk;
      currentRisk = Math.max(0, currentRisk);
      currentCostBasis = Math.max(0, currentCostBasis);

      currentCash += (incomeAvailable + actualNetFromRisk - monthlyExpensesVal);
      monthlyWithdrawal = takenFromCash + grossFromRisk;
    }

    investmentGain = currentRisk * returnRate;
    currentRisk += investmentGain;

    if (recordMonthly && m <= maxMonths) {
      const last = monthlyData[monthlyData.length - 1];
      if (last) {
        last.investmentGain = investmentGain;
        last.withdrawal = monthlyWithdrawal;
      }
    }
  }

  const survived = (currentCash + currentRisk) >= 0;
  return { fireReachedMonth, monthlyData, survived, finalAssets: currentCash + currentRisk };
}

function findSurvivalMonth(params, returnsArray = null) {
  const { currentAge, maxMonths } = params;
  const totalMonthsLimit = Math.min(maxMonths, (100 - currentAge) * 12);

  let result = -1;

  for (let m = 0; m <= totalMonthsLimit; m += 12) {
    const res = _runCoreSimulation(params, { fireMonth: m, returnsArray });
    if (res.survived) {
      result = m;
      break;
    }
  }

  if (result !== -1) {
    let monthlyLow = Math.max(0, result - 11);
    let monthlyHigh = result;
    while (monthlyLow <= monthlyHigh) {
      const mid = Math.floor((monthlyLow + monthlyHigh) / 2);
      const res = _runCoreSimulation(params, { fireMonth: mid, returnsArray });
      if (res.survived) {
        result = mid;
        monthlyHigh = mid - 1;
      } else {
        monthlyLow = mid + 1;
      }
    }
  }

  return result;
}

export function performFireSimulation(inputParams, options = {}) {
  const params = normalizeFireParams(inputParams);
  const { forceFireMonth = null, returnsArray = null, recordMonthly = false } = options;

  let targetReturns = returnsArray;
  if (!targetReturns) {
    const { currentAge, annualReturnRate } = params;
    const totalMonthsUntil100 = (100 - currentAge) * 12;
    const monthlyReturnMean = Math.pow(1 + annualReturnRate, 1 / 12) - 1;

    targetReturns = [];
    for (let m = 0; m <= totalMonthsUntil100; m++) {
      targetReturns.push(monthlyReturnMean);
    }
  }

  let fireMonth = forceFireMonth;
  if (fireMonth === null) {
    fireMonth = findSurvivalMonth(params, targetReturns);
  }

  return _runCoreSimulation(params, {
    recordMonthly,
    fireMonth,
    returnsArray: targetReturns
  });
}

export function generateGrowthTable(params) {
  const { monthlyData, fireReachedMonth } = performFireSimulation(params, { recordMonthly: true });
  return {
    table: monthlyData.map(d => ({
      month: d.month,
      age: d.age,
      assets: d.assets,
      requiredAssets: d.requiredAssets,
      isFire: d.isFire,
    })),
    fireReachedMonth,
  };
}

export function generateAnnualSimulation(params) {
  const { monthlyData, fireReachedMonth } = performFireSimulation(params, { recordMonthly: true });
  const yearlySummaries = [];
  for (let y = 0; y < Math.ceil(monthlyData.length / 12); y++) {
    const startIdx = y * 12;
    const endIdx = Math.min(startIdx + 12, monthlyData.length);
    const slice = monthlyData.slice(startIdx, endIdx);
    const income = slice.reduce((sum, m) => sum + m.income, 0);
    const pension = slice.reduce((sum, m) => sum + m.pension, 0);
    const expenses = slice.reduce((sum, m) => sum + m.expenses, 0);
    const withdrawal = slice.reduce((sum, m) => sum + m.withdrawal, 0);
    const gain = slice.reduce((sum, m) => sum + m.investmentGain, 0);
    const firstMonth = monthlyData[startIdx];
    const endMonth = (endIdx < monthlyData.length) ? monthlyData[endIdx] : monthlyData[endIdx - 1];
    const endCash = (endIdx < monthlyData.length) ? monthlyData[endIdx].cashAssets : monthlyData[endIdx - 1].cashAssets;
    const fireMonthInYear = fireReachedMonth >= startIdx && fireReachedMonth < endIdx
      ? fireReachedMonth
      : null;
    yearlySummaries.push({
      age: Math.floor(firstMonth.age),
      income: Math.round(income),
      pension: Math.round(pension),
      expenses: Math.round(expenses),
      withdrawal: Math.round(withdrawal),
      investmentGain: Math.round(gain),
      assets: Math.round(firstMonth.assets),
      assetsYearEnd: Math.round(endMonth.assets),
      riskAssets: Math.round(firstMonth.riskAssets),
      cashAssets: Math.round(firstMonth.cashAssets),
      savings: Math.round(endCash - firstMonth.cashAssets),
      fireMonthInYear,
    });
  }
  return yearlySummaries;
}

function createRandom(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function nextGaussian(rand) {
  let u = 0, v = 0;
  while(u === 0) u = rand();
  while(v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runMonteCarloSimulation(inputParams, { trials = 1000, annualVolatility = 0.15, seed = 123 } = {}) {
  const params = normalizeFireParams(inputParams);
  const detResult = performFireSimulation(params);
  const fireMonth = detResult.fireReachedMonth;
  const safeTrials = Math.max(1, Math.floor(Number(trials) || 0));
  const safeAnnualVolatility = Math.max(0, Number.isFinite(annualVolatility) ? annualVolatility : 0);
  const rand = createRandom(seed);

  const { currentAge, annualReturnRate } = params;
  const totalMonths = (100 - currentAge) * 12;

  const mu = annualReturnRate;
  const sigma = safeAnnualVolatility;
  const alpha = Math.log(1 + mu) - 0.5 * Math.log(1 + Math.pow(sigma / (1 + mu), 2));
  const betaSq = Math.log(1 + Math.pow(sigma / (1 + mu), 2));

  const alphaM = alpha / 12;
  const betaM = Math.sqrt(betaSq / 12);

  const finalAssetsList = [];
  const annualHistory = [];
  let successCount = 0;

  const totalYears = Math.ceil(totalMonths / 12);

  for (let t = 0; t < safeTrials; t++) {
    const returnsArray = [];
    for (let m = 0; m <= totalMonths; m++) {
      const logReturn = alphaM + betaM * nextGaussian(rand);
      returnsArray.push(Math.exp(logReturn) - 1);
    }

    const res = _runCoreSimulation(params, {
      fireMonth,
      returnsArray,
      recordMonthly: true,
      skipRequiredAssets: true
    });

    finalAssetsList.push(res.finalAssets);
    if (res.survived) successCount++;

    const yearAssets = [];
    for (let y = 0; y <= totalYears; y++) {
      const mIdx = y * 12;
      if (mIdx < res.monthlyData.length) {
        yearAssets.push(res.monthlyData[mIdx].assets);
      } else {
        yearAssets.push(res.monthlyData[res.monthlyData.length - 1].assets);
      }
    }
    annualHistory.push(yearAssets);
  }

  finalAssetsList.sort((a, b) => a - b);

  const interpolatePercentile = (sortedValues, p) => {
    if (sortedValues.length === 1) return sortedValues[0];
    const pos = (p / 100) * (sortedValues.length - 1);
    const lowerIndex = Math.floor(pos);
    const upperIndex = Math.ceil(pos);
    if (lowerIndex === upperIndex) return sortedValues[lowerIndex];
    const weight = pos - lowerIndex;
    return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight;
  };

  const getPercentile = (p) => interpolatePercentile(finalAssetsList, p);

  const p10Path = [];
  const p50Path = [];
  const p90Path = [];

  for (let y = 0; y <= totalYears; y++) {
    const assetsAtY = annualHistory.map(h => h[y]).sort((a, b) => a - b);
    p10Path.push(interpolatePercentile(assetsAtY, 10));
    p50Path.push(interpolatePercentile(assetsAtY, 50));
    p90Path.push(interpolatePercentile(assetsAtY, 90));
  }

  return {
    successRate: successCount / safeTrials,
    p10: getPercentile(10),
    p50: getPercentile(50),
    p90: getPercentile(90),
    p10Path,
    p50Path,
    p90Path,
    trials: safeTrials,
    fireReachedMonth: fireMonth
  };
}
