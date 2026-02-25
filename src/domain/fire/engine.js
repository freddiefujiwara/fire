import { calculateMonthlyPension, DEFAULT_PENSION_CONFIG, calculateStartAgeAdjustmentRate } from "./pension";
import { formatYen } from "../format";

export {
  calculateMonthlyPension,
  DEFAULT_PENSION_CONFIG,
  calculateStartAgeAdjustmentRate,
};

const MONTHS_PER_YEAR = 12;
const SIMULATION_END_AGE = 100;
const MIN_SIMULATION_END_AGE = 80;

/**
 * Build readable explanation segments for the simulation result.
 * @param {object} params - Values used to build each explanation segment.
 * @returns {Array<{type: string, value: string}>} Explanation parts in display order.
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
    pensionConfig,
    pensionParticipationEndAge,
    pensionFutureYears,
    pensionProjectedAnnual,
    simulationEndAge = SIMULATION_END_AGE,
  } = params;

  const segments = [
    { type: "text", value: `本シミュレーションは、設定された期待リターン・インフレ率・年金・ローン等のキャッシュフローに基づき、${simulationEndAge}歳時点で資産が残る最短リタイア年齢を算出しています。\n・必要資産目安は「FIRE達成年齢で退職して${simulationEndAge}歳まで資産が尽きない最小条件」を満たす達成時点の金融資産額と同じ定義です。\n` },
  ];

  const startAge = Number(pensionConfig?.userStartAge ?? 65);
  const inferredAdjustmentRate = calculateStartAgeAdjustmentRate(startAge);
  const appliedAdjustmentRate = pensionConfig?.earlyReduction ?? inferredAdjustmentRate;
  const adjustmentMonths = Math.max(0, Math.round(Math.abs(65 - startAge) * 12));
  const adjustmentType = startAge < 65 ? "繰上げ" : startAge > 65 ? "繰下げ" : "65歳開始";

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
    { type: "text", value: `）
・算定根拠:
  - 将来加算年数 (futureYears) = participationEndAge - pensionDataAge
  - 厚生年金受取年額 = データ基準年時点の厚生年金加入実績額 + (今後の厚生年金増分 × 将来加算年数)
  - 本ケースでは participationEndAge=` },
    { type: "text", value: String(pensionParticipationEndAge) },
    { type: "text", value: `歳, pensionDataAge=` },
    { type: "text", value: String(pensionConfig?.pensionDataAge ?? "-") },
    { type: "text", value: `歳 なので futureYears=` },
    { type: "text", value: String(pensionFutureYears) },
    { type: "text", value: `年。
  - 受取年額 = ` },
    { type: "amount", value: formatYen(pensionConfig?.userKoseiAccruedAtDataAgeAnnualYen || 0) },
    { type: "text", value: ` + (` },
    { type: "amount", value: formatYen(pensionConfig?.userKoseiFutureFactorAnnualYenPerYear || 0) },
    { type: "text", value: ` × ` },
    { type: "text", value: String(pensionFutureYears) },
    { type: "text", value: `年) = ` },
    { type: "amount", value: formatYen(pensionProjectedAnnual) },
    { type: "text", value: ` として計算。
  - 受給開始年齢による調整率:
    - 65歳開始を基準(1.0)とし、繰上げは1か月ごとに0.4%減額、繰下げは1か月ごとに0.7%増額として計算。
    - 本ケース: 受給開始年齢=` },
    { type: "text", value: String(startAge) },
    { type: "text", value: `歳（` },
    { type: "text", value: adjustmentType },
    { type: "text", value: `）、調整月数=` },
    { type: "text", value: String(adjustmentMonths) },
    { type: "text", value: `か月。
    - 自動算出調整率 = ` },
    { type: "text", value: String(inferredAdjustmentRate.toFixed(3)) },
    { type: "text", value: `。
    - 適用調整率 = ` },
    { type: "text", value: String(appliedAdjustmentRate.toFixed(3)) },
    { type: "text", value: `（URL等で明示指定があればその値、未指定なら上記の自動算出値）。
    - ご本人の年金年額 = (基礎年金満額 × 基礎年金反映率 + 厚生年金受取年額) × 適用調整率。
  - リタイアに伴う厚生年金加入期間の停止を考慮。
  - 繰上げ受給等の減額率設定を反映。

住宅ローンは完済月（最終支払月）までは返済額を含め、完済月の翌月以降は月間支出から返済額を自動的に差し引いてシミュレーションを継続します。
` }
  );

  /* c8 ignore next 3 */
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
・減額係数（family設定の既定値）: ${defaultReductionText}
・住宅ローン返済額は別建てで扱い、完済月（最終支払月）までは固定額、翌月から0円として計算します。
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
    { type: "text", value: "\n■ 各項目の算出定義\n・収入 (年金込): 定期収入（給与等） + 年金受給額の合算です。\n・支出: (基本生活費 - 住宅ローン) × インフレ調整 + 住宅ローン(固定) + FIRE後追加支出（FIRE達成月より加算） + FIRE1年目特別支出\n・運用益: 当年中の運用リターン合計。月次複利で計算されます。\n・取り崩し額: 生活費の不足分、または「資産 × 取崩率」のいずれか大きい額を引き出します。FIRE後は収入や現金が残っていても、取崩率ルールが下限として適用されるため取り崩しが発生することがあります（税金考慮時は利益分のみグロスアップ）。\n・貯金額 (現金): 前年末残高 + 当年収支(収入 - 支出) - 当年投資額 + リスク資産からの補填（純額）\n・リスク資産額: 前年末残高 + 投資額 + 運用益 - 取崩額(グロス)\n\nFIRE後の追加支出（デフォルト" },
    { type: "amount", value: formatYen(postFireExtraExpenseMonthly) },
    { type: "text", value: "）は、国民年金、国民健康保険、固定資産税等を合算した目安値です。\n・リタイア1年目の特別支出: 前年所得に基づく社会保険料・住民税のスパイク分として、FIRE後12か月間にわたり年額 " },
    { type: "amount", value: formatYen(postFireFirstYearExtraExpense) },
    { type: "text", value: "（インフレ調整あり）が追加で計上されます。" }
  );

  return segments;
}

/**
 * Estimate the minimum assets needed at one month so funds last to age 100.
 * @param {object} params - Inputs for backward required-asset calculation.
 * @returns {number} Required asset amount for the month.
 */
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

/**
 * Convert a date object to a YYYY-MM key string.
 * @param {Date} date - Date to convert.
 * @returns {string} Month key text.
 */
function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Calculate the monthly expense after inflation, mortgage, and family changes.
 * @param {object} params - Expense inputs for one month.
 * @returns {number} Expense amount for that month.
 */
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

  /* c8 ignore next 1 */
  const keyList = independenceMonthKeys.length > 0 ? independenceMonthKeys : (independenceMonthKey ? [independenceMonthKey] : []);
  const independentChildrenCount = keyList.filter((key) => currentMonthKey >= key).length;

  const effectiveReduction = calculateFamilyExpenseReduction({
    householdChildrenCount,
    independentChildrenCount,
    lifestyleReductionFactor,
  });

  const inflatedNonMortgage = (nonMortgageExpense * effectiveReduction) * Math.pow(1 + monthlyInflationRate, monthIndex);

  if (!mortgage || !mortgagePayoffDate) {
    return inflatedNonMortgage + mortgage;
  }

  if (currentMonthKey > mortgagePayoffDate) {
    return inflatedNonMortgage;
  }

  return inflatedNonMortgage + mortgage;
}

/**
 * Get expense reduction factor based on how many children became independent.
 * @param {object} params - Child count and lifestyle settings.
 * @returns {number} Multiplier for non-mortgage expenses.
 */
function calculateFamilyExpenseReduction({ householdChildrenCount, independentChildrenCount, lifestyleReductionFactor }) {
  if (householdChildrenCount <= 1) {
    return independentChildrenCount > 0 ? lifestyleReductionFactor : 1.0;
  }

  if (householdChildrenCount === 2) {
    const factors = [1.0, 0.85, 0.70];
    return factors[Math.min(independentChildrenCount, 2)];
  }

  const factors = [1.0, 0.90, 0.80, 0.65];
  return factors[Math.min(independentChildrenCount, 3)];
}

/**
 * Build sorted month keys when each dependent becomes independent.
 * @param {string[]} [dependentBirthDates=[]] - Dependent birth dates.
 * @param {number} [independenceAge=24] - Age used as independence point.
 * @returns {string[]} Sorted independence month keys.
 */
function getIndependenceMonthKeys(dependentBirthDates = [], independenceAge = 24) {
  /* c8 ignore next 1 */
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

/**
 * Normalize raw simulation input into a full parameter object.
 * @param {object} params - Raw user settings.
 * @returns {object} Normalized simulation settings.
 */
export function normalizeFireParams(params) {
  if (!params) return normalizeFireParams({});
  const monthlyExpense = params.monthlyExpense ?? (params.monthlyExpenses ? params.monthlyExpenses / 12 : 0);
  const currentAge = Number(params.currentAge || 40);
  const normalizedSimulationEndAge = Number(params.simulationEndAge ?? SIMULATION_END_AGE);
  const minAllowedSimulationEndAge = Math.max(MIN_SIMULATION_END_AGE, Math.ceil(currentAge));
  const simulationEndAge = Math.min(
    SIMULATION_END_AGE,
    Math.max(minAllowedSimulationEndAge, Number.isFinite(normalizedSimulationEndAge) ? normalizedSimulationEndAge : SIMULATION_END_AGE),
  );

  return {
    initialAssets: Number(params.initialAssets ?? 0),
    riskAssets: Number(params.riskAssets ?? 0),
    annualReturnRate: Number(params.annualReturnRate ?? 0),
    monthlyExpense: Number(monthlyExpense),
    monthlyIncome: Number(params.monthlyIncome ?? 0),
    currentAge,
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
    pensionConfig: params.pensionConfig || DEFAULT_PENSION_CONFIG,
    dependentBirthDate: params.dependentBirthDate || null,
    dependentBirthDates: Array.isArray(params.dependentBirthDates)
      ? params.dependentBirthDates.filter(Boolean).slice(0, 3)
      : (params.dependentBirthDate ? [params.dependentBirthDate] : []),
    independenceAge: params.independenceAge || 24,
    householdType: params.householdType || "single",
    simulationEndAge,
  };
}

/**
 * Run one full FIRE simulation path with optional monthly recording.
 * @param {object} params - Normalized simulation settings.
 * @param {object} [options={}] - Runtime options for this run.
 * @returns {{fireReachedMonth: number, monthlyData: Array<object>|null, survived: boolean, finalAssets: number}} Simulation result object.
 */
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
    simulationEndAge = SIMULATION_END_AGE,
  } = params;

  const monthlyExp = monthlyExpense;
  const monthlyReturnMean = Math.pow(1 + annualReturnRate, 1 / 12) - 1;
  const monthlyInflationRate = Math.pow(1 + (includeInflation ? inflationRate : 0), 1 / 12) - 1;
  const totalMonthsUntilEndAge = (simulationEndAge - currentAge) * MONTHS_PER_YEAR;
  const simulationStartDate = new Date();
  const effectiveDependentBirthDates = resolveDependentBirthDates({ dependentBirthDate, dependentBirthDates });
  const independenceMonthKeys = getIndependenceMonthKeys(effectiveDependentBirthDates, independenceAge);
  const householdChildrenCount = householdType === "family" ? effectiveDependentBirthDates.length : 0;

  let currentRisk = riskAssets;
  let currentCostBasis = riskAssets;
  let currentCash = initialAssets - riskAssets;
  let fireReachedMonth = fireMonth;
  const monthlyData = recordMonthly ? [] : null;

  const simulationLimit = totalMonthsUntilEndAge;
  const lifestyleReductionFactor = householdType === "family" ? 0.8 : 1.0;

  const { precalculatedBaseExpenses, precalculatedExtraExpenses } = precalculateExpenses({
    simulationLimit,
    monthlyExp,
    monthlyInflationRate,
    simulationStartDate,
    mortgageMonthlyPayment,
    mortgagePayoffDate,
    lifestyleReductionFactor,
    independenceMonthKeys,
    householdChildrenCount,
    postFireExtraExpense,
  });

  for (let m = 0; m <= simulationLimit; m++) {
    const ageAtMonthM = currentAge + m / 12;
    const remainingMonths = Math.max(0, totalMonthsUntilEndAge - m);

    if (m === fireReachedMonth) {
      currentCash += retirementLumpSumAtFire;
    }

    let firstYearSpikeWithInf = 0;
    if (fireReachedMonth !== -1 && m >= fireReachedMonth && m < fireReachedMonth + 12) {
      firstYearSpikeWithInf = (postFireFirstYearExtraExpense / 12) * Math.pow(1 + monthlyInflationRate, m);
    }

    const assets = Math.max(0, currentCash + currentRisk);

    const isFire = fireReachedMonth !== -1 && m >= fireReachedMonth;
    const fireAgeAtMonthM = fireReachedMonth === -1 ? simulationEndAge : currentAge + fireReachedMonth / 12;
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

    if (m === totalMonthsUntilEndAge) break;

    let monthlyWithdrawal = 0;
    let monthlyInvest = 0;
    let investmentGain = 0;
    const returnRate = returnsArray[m];

    if (!isFire) {
      const netFlow = incomeAvailable - monthlyExpensesVal;
      const cashAfterFlow = currentCash + netFlow;

      if (cashAfterFlow < 0) {
        const needed = Math.abs(cashAfterFlow);
        const withdrawal = withdrawFromRiskAssets({
          neededNetAmount: needed,
          currentRisk,
          currentCostBasis,
          includeTax,
          taxRate,
        });

        currentRisk = withdrawal.nextRisk;
        currentCostBasis = withdrawal.nextCostBasis;

        currentCash = cashAfterFlow + withdrawal.actualNetFromRisk;
        monthlyWithdrawal = withdrawal.actualNetFromRisk > 0 ? withdrawal.grossFromRisk : 0;
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

      const withdrawal = withdrawFromRiskAssets({
        neededNetAmount: remainingShortfall,
        currentRisk,
        currentCostBasis,
        includeTax,
        taxRate,
      });

      currentRisk = withdrawal.nextRisk;
      currentCostBasis = withdrawal.nextCostBasis;

      currentCash += (incomeAvailable + withdrawal.actualNetFromRisk - monthlyExpensesVal);
      monthlyWithdrawal = takenFromCash + withdrawal.grossFromRisk;
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

/**
 * Find the earliest month where retiring still keeps assets alive to age 100.
 * @param {object} params - Normalized simulation settings.
 * @param {number[]|null} [returnsArray=null] - Monthly return path to use.
 * @returns {number} Earliest safe FIRE month, or -1 when none found.
 */
function findSurvivalMonth(params, returnsArray = null) {
  const { currentAge, maxMonths, simulationEndAge } = params;
  const totalMonthsLimit = Math.min(maxMonths, (simulationEndAge - currentAge) * MONTHS_PER_YEAR);

  let result = -1;

  for (let m = 0; m <= totalMonthsLimit; m += MONTHS_PER_YEAR) {
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

/**
 * Run the main FIRE simulation with optional overrides.
 * @param {object} inputParams - Raw simulation settings.
 * @param {object} [options={}] - Optional controls for fire month and returns.
 * @returns {{fireReachedMonth: number, monthlyData: Array<object>|null, survived: boolean, finalAssets: number}} Simulation result object.
 */
export function performFireSimulation(inputParams, options = {}) {
  const params = normalizeFireParams(inputParams);
  const { forceFireMonth = null, returnsArray = null, recordMonthly = false } = options;

  let targetReturns = returnsArray;
  if (!targetReturns) {
    const { currentAge, annualReturnRate, simulationEndAge } = params;
    const totalMonthsUntilEndAge = (simulationEndAge - currentAge) * MONTHS_PER_YEAR;
    const monthlyReturnMean = Math.pow(1 + annualReturnRate, 1 / 12) - 1;
    targetReturns = createConstantReturnsArray(totalMonthsUntilEndAge, monthlyReturnMean);
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

/**
 * Create monthly growth rows for chart and table display.
 * @param {object} params - Raw simulation settings.
 * @returns {{table: Array<object>, fireReachedMonth: number}} Monthly growth table and fire month.
 */
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

/**
 * Convert monthly simulation data into yearly summary rows.
 * @param {object} params - Raw simulation settings.
 * @returns {Array<object>} Yearly simulation summary rows.
 */
export function generateAnnualSimulation(params) {
  const { monthlyData, fireReachedMonth } = performFireSimulation(params, { recordMonthly: true });
  const yearlySummaries = [];
  for (let y = 0; y < Math.ceil(monthlyData.length / MONTHS_PER_YEAR); y++) {
    const startIdx = y * MONTHS_PER_YEAR;
    const endIdx = Math.min(startIdx + MONTHS_PER_YEAR, monthlyData.length);
    const slice = monthlyData.slice(startIdx, endIdx);

    const firstMonth = monthlyData[startIdx];
    const endMonth = monthlyData[endIdx - 1];
    const fireMonthInYear = fireReachedMonth >= startIdx && fireReachedMonth < endIdx
      ? fireReachedMonth
      : null;

    yearlySummaries.push({
      age: Math.floor(firstMonth.age),
      income: Math.round(sumByField(slice, "income")),
      pension: Math.round(sumByField(slice, "pension")),
      expenses: Math.round(sumByField(slice, "expenses")),
      withdrawal: Math.round(sumByField(slice, "withdrawal")),
      investmentGain: Math.round(sumByField(slice, "investmentGain")),
      assets: Math.round(firstMonth.assets),
      assetsYearEnd: Math.round(endMonth.assets),
      riskAssets: Math.round(firstMonth.riskAssets),
      cashAssets: Math.round(firstMonth.cashAssets),
      savings: Math.round(endMonth.cashAssets - firstMonth.cashAssets),
      fireMonthInYear,
    });
  }
  return yearlySummaries;
}

/**
 * Create a seeded random number generator.
 * @param {number} seed - Seed value for reproducible random output.
 * @returns {() => number} Function that returns a random number from 0 to 1.
 */
function createRandom(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Sample one standard normal random value with Box-Muller method.
 * @param {() => number} rand - Uniform random function.
 * @returns {number} One normally distributed value.
 */
function nextGaussian(rand) {
  let u = 0, v = 0;
  while(u === 0) u = rand();
  while(v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Run many simulations with random returns and report percentile outcomes.
 * @param {object} inputParams - Raw simulation settings.
 * @param {{trials?: number, annualVolatility?: number, seed?: number, forceFireMonth?: number|null}} [options={}] - Monte Carlo controls.
 * @returns {{successRate: number, p10: number, p50: number, p90: number, p10Path: number[], p50Path: number[], p90Path: number[], trials: number, fireReachedMonth: number}} Monte Carlo summary values.
 */
export function runMonteCarloSimulation(inputParams, { trials = 1000, annualVolatility = 0.15, seed = 123, forceFireMonth = null } = {}) {
  const params = normalizeFireParams(inputParams);
  const detResult = performFireSimulation(params, { forceFireMonth });
  const fireMonth = detResult.fireReachedMonth;
  const safeTrials = Math.max(1, Math.floor(Number(trials) || 0));
  const safeAnnualVolatility = Math.max(0, Number.isFinite(annualVolatility) ? annualVolatility : 0);
  const rand = createRandom(seed);

  const { currentAge, annualReturnRate, simulationEndAge } = params;
  const totalMonths = (simulationEndAge - currentAge) * MONTHS_PER_YEAR;

  const mu = annualReturnRate;
  const sigma = safeAnnualVolatility;
  const alpha = Math.log(1 + mu) - 0.5 * Math.log(1 + Math.pow(sigma / (1 + mu), 2));
  const betaSq = Math.log(1 + Math.pow(sigma / (1 + mu), 2));

  const alphaM = alpha / 12;
  const betaM = Math.sqrt(betaSq / 12);

  const finalAssetsList = [];
  const annualHistory = [];
  let successCount = 0;

  const totalYears = Math.ceil(totalMonths / MONTHS_PER_YEAR);

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
      const mIdx = y * MONTHS_PER_YEAR;
      if (mIdx < res.monthlyData.length) {
        yearAssets.push(res.monthlyData[mIdx].assets);
      } else {
        yearAssets.push(res.monthlyData[res.monthlyData.length - 1].assets);
      }
    }
    annualHistory.push(yearAssets);
  }

  finalAssetsList.sort((a, b) => a - b);

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

/**
 * Search a withdrawal rate that brings median terminal assets close to target.
 * @param {object} inputParams - Raw simulation settings.
 * @param {{trials?: number, annualVolatility?: number, seed?: number, forceFireMonth?: number|null, targetTerminalAssets?: number, toleranceYen?: number, minWithdrawalRate?: number, maxWithdrawalRate?: number, maxIterations?: number}} [options={}] - Search and Monte Carlo controls.
 * @returns {{recommendedWithdrawalRate: number, p50TerminalAssets: number, successRate: number, iterations: number, boundaryHit: "low"|"high"|null, evaluation: object}} Search result summary.
 */
export function findWithdrawalRateForMedianDepletion(
  inputParams,
  {
    trials = 1000,
    annualVolatility = 0.15,
    seed = 123,
    forceFireMonth = null,
    targetTerminalAssets = 0,
    toleranceYen = 100000,
    minWithdrawalRate = 0,
    maxWithdrawalRate = 0.2,
    maxIterations = 18,
  } = {},
) {
  const params = normalizeFireParams(inputParams);
  const lowerBound = Math.max(0, Number(minWithdrawalRate) || 0);
  const upperBound = Math.max(lowerBound, Number(maxWithdrawalRate) || 0.2);

  const evaluate = (withdrawalRate) => runMonteCarloSimulation(
    { ...params, withdrawalRate },
    { trials, annualVolatility, seed, forceFireMonth },
  );

  const lowEval = evaluate(lowerBound);
  if (lowEval.p50 <= targetTerminalAssets + toleranceYen) {
    return {
      recommendedWithdrawalRate: lowerBound,
      p50TerminalAssets: lowEval.p50,
      successRate: lowEval.successRate,
      iterations: 1,
      boundaryHit: "low",
      evaluation: lowEval,
    };
  }

  const highEval = evaluate(upperBound);
  if (highEval.p50 > targetTerminalAssets + toleranceYen) {
    return {
      recommendedWithdrawalRate: upperBound,
      p50TerminalAssets: highEval.p50,
      successRate: highEval.successRate,
      iterations: 2,
      boundaryHit: "high",
      evaluation: highEval,
    };
  }

  let low = lowerBound;
  let high = upperBound;
  let bestEval = highEval;
  let bestRate = upperBound;
  let iterations = 2;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const midEval = evaluate(mid);
    iterations += 1;

    if (Math.abs(midEval.p50 - targetTerminalAssets) < Math.abs(bestEval.p50 - targetTerminalAssets)) {
      bestEval = midEval;
      bestRate = mid;
    }

    if (Math.abs(midEval.p50 - targetTerminalAssets) <= toleranceYen) {
      return {
        recommendedWithdrawalRate: mid,
        p50TerminalAssets: midEval.p50,
        successRate: midEval.successRate,
        iterations,
        boundaryHit: null,
        evaluation: midEval,
      };
    }

    if (midEval.p50 > targetTerminalAssets) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return {
    recommendedWithdrawalRate: bestRate,
    p50TerminalAssets: bestEval.p50,
    successRate: bestEval.successRate,
    iterations,
    boundaryHit: null,
    evaluation: bestEval,
  };
}

/**
 * Run a full Monte Carlo analysis including target success rate search and median depletion search.
 * @param {object} inputParams - Raw simulation settings.
 * @param {object} options - Analysis options (trials, annualVolatility, seed, targetSuccessRate, simulationEndAge, currentAge).
 * @returns {object} Analysis results.
 */
export function runFullMonteCarloAnalysis(inputParams, options) {
  const params = normalizeFireParams(inputParams);
  const {
    trials = 1000,
    annualVolatility = 0.15,
    seed = 123,
    targetSuccessRate = 0.8,
    simulationEndAge = 100,
    currentAge = 40,
  } = options;

  const targetRate = Math.min(0.99, Math.max(0.01, targetSuccessRate));
  const totalMonths = Math.max(0, Math.floor((simulationEndAge - currentAge) * 12));
  const simOptions = {
    trials,
    annualVolatility,
    seed,
  };

  const evaluateAtMonth = (month) => runMonteCarloSimulation(params, {
    ...simOptions,
    forceFireMonth: month,
  });

  let recommendedMonth = totalMonths;
  let recommendedResult = evaluateAtMonth(recommendedMonth);

  if (recommendedResult.successRate < targetRate) {
    recommendedMonth = -1;
  } else {
    const immediateResult = evaluateAtMonth(0);
    if (immediateResult.successRate >= targetRate) {
      recommendedMonth = 0;
      recommendedResult = immediateResult;
    } else {
      let low = 0;
      let high = totalMonths;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const midResult = evaluateAtMonth(mid);
        if (midResult.successRate >= targetRate) {
          high = mid;
          recommendedResult = midResult;
        } else {
          low = mid + 1;
        }
      }
      recommendedMonth = low;
      recommendedResult = evaluateAtMonth(recommendedMonth);
    }
  }

  const terminalDepletionPlan = findFireMonthForMedianDepletion(params, {
    ...simOptions,
    targetTerminalAssets: 0,
    toleranceYen: 500000,
    minFireMonth: 0,
    maxFireMonth: totalMonths,
  });

  return {
    ...recommendedResult,
    targetSuccessRate: targetRate,
    recommendedFireMonth: recommendedMonth,
    recommendedFireAge: recommendedMonth === -1 ? null : Math.floor(currentAge + recommendedMonth / 12),
    terminalDepletionPlan,
  };
}

/**
 * Search a FIRE timing that brings median terminal assets close to target.
 * @param {object} inputParams - Raw simulation settings.
 * @param {{trials?: number, annualVolatility?: number, seed?: number, targetTerminalAssets?: number, toleranceYen?: number, minFireMonth?: number, maxFireMonth?: number, maxIterations?: number}} [options={}] - Search and Monte Carlo controls.
 * @returns {{recommendedFireMonth: number, p50TerminalAssets: number, successRate: number, iterations: number, boundaryHit: "low"|"high"|null, evaluation: object}} Search result summary.
 */
export function findFireMonthForMedianDepletion(
  inputParams,
  {
    trials = 1000,
    annualVolatility = 0.15,
    seed = 123,
    targetTerminalAssets = 0,
    toleranceYen = 100000,
    minFireMonth = 0,
    maxFireMonth = null,
    maxIterations = 18,
  } = {},
) {
  const params = normalizeFireParams(inputParams);
  const totalMonths = Math.max(0, Math.floor((params.simulationEndAge - params.currentAge) * MONTHS_PER_YEAR));

  const lowerBound = Math.max(0, Math.floor(Number(minFireMonth) || 0));
  const upperBound = Math.min(
    totalMonths,
    Math.max(lowerBound, Math.floor(Number(maxFireMonth ?? totalMonths) || totalMonths)),
  );

  const evaluate = (fireMonth) => runMonteCarloSimulation(
    params,
    { trials, annualVolatility, seed, forceFireMonth: fireMonth },
  );

  const lowEval = evaluate(lowerBound);
  if (lowEval.p50 >= targetTerminalAssets - toleranceYen) {
    return {
      recommendedFireMonth: lowerBound,
      p50TerminalAssets: lowEval.p50,
      successRate: lowEval.successRate,
      iterations: 1,
      boundaryHit: "low",
      evaluation: lowEval,
    };
  }

  const highEval = evaluate(upperBound);
  if (highEval.p50 < targetTerminalAssets - toleranceYen) {
    return {
      recommendedFireMonth: upperBound,
      p50TerminalAssets: highEval.p50,
      successRate: highEval.successRate,
      iterations: 2,
      boundaryHit: "high",
      evaluation: highEval,
    };
  }

  let low = lowerBound;
  let high = upperBound;
  let bestEval = highEval;
  let bestMonth = upperBound;
  let iterations = 2;

  for (let i = 0; i < maxIterations; i++) {
    const mid = Math.floor((low + high) / 2);
    const midEval = evaluate(mid);
    iterations += 1;

    if (Math.abs(midEval.p50 - targetTerminalAssets) < Math.abs(bestEval.p50 - targetTerminalAssets)) {
      bestEval = midEval;
      bestMonth = mid;
    }

    if (Math.abs(midEval.p50 - targetTerminalAssets) <= toleranceYen) {
      return {
        recommendedFireMonth: mid,
        p50TerminalAssets: midEval.p50,
        successRate: midEval.successRate,
        iterations,
        boundaryHit: null,
        evaluation: midEval,
      };
    }

    if (midEval.p50 >= targetTerminalAssets) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return {
    recommendedFireMonth: bestMonth,
    p50TerminalAssets: bestEval.p50,
    successRate: bestEval.successRate,
    iterations,
    boundaryHit: null,
    evaluation: bestEval,
  };
}

/**
 * Choose the effective dependent birth date list from old and new inputs.
 * @param {{dependentBirthDate: string|null, dependentBirthDates: string[]}} params - Dependent birth date inputs.
 * @returns {string[]} Effective dependent birth date list.
 */
function resolveDependentBirthDates({ dependentBirthDate, dependentBirthDates }) {
  const fallbackDependentBirthDates = dependentBirthDate ? [dependentBirthDate] : [];
  return (dependentBirthDates && dependentBirthDates.length > 0)
    ? dependentBirthDates
    : fallbackDependentBirthDates;
}

/**
 * Precompute base and extra expense arrays for all simulation months.
 * @param {object} params - Values needed to build expense arrays.
 * @returns {{precalculatedBaseExpenses: number[], precalculatedExtraExpenses: number[]}} Precalculated monthly expense arrays.
 */
function precalculateExpenses({
  simulationLimit,
  monthlyExp,
  monthlyInflationRate,
  simulationStartDate,
  mortgageMonthlyPayment,
  mortgagePayoffDate,
  lifestyleReductionFactor,
  independenceMonthKeys,
  householdChildrenCount,
  postFireExtraExpense,
}) {
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

  return { precalculatedBaseExpenses, precalculatedExtraExpenses };
}

/**
 * Withdraw enough from risk assets while accounting for tax on gains.
 * @param {object} params - Withdrawal request and portfolio values.
 * @returns {{actualNetFromRisk: number, grossFromRisk: number, nextCostBasis: number, nextRisk: number}} Withdrawal result values.
 */
function withdrawFromRiskAssets({ neededNetAmount, currentRisk, currentCostBasis, includeTax, taxRate }) {
  const gainRatio = currentRisk > 0 ? Math.max(0, (currentRisk - currentCostBasis) / currentRisk) : 0;
  const taxDrag = includeTax ? gainRatio * taxRate : 0;
  const netMultiplier = 1 - taxDrag;
  const maxNetFromRisk = Math.max(0, currentRisk * netMultiplier);
  const actualNetFromRisk = Math.min(neededNetAmount, maxNetFromRisk);
  const grossFromRisk = actualNetFromRisk / netMultiplier;

  const costBasisWithdrawn = grossFromRisk * (1 - gainRatio);
  const nextCostBasis = Math.max(0, currentCostBasis - costBasisWithdrawn);
  const nextRisk = Math.max(0, currentRisk - grossFromRisk);

  return { actualNetFromRisk, grossFromRisk, nextCostBasis, nextRisk };
}

/**
 * Create a fixed monthly return array with the same value each month.
 * @param {number} totalMonths - Number of months to include.
 * @param {number} monthlyReturnMean - Return value for each month.
 * @returns {number[]} Monthly return array.
 */
function createConstantReturnsArray(totalMonths, monthlyReturnMean) {
  const targetReturns = [];
  for (let m = 0; m <= totalMonths; m++) {
    targetReturns.push(monthlyReturnMean);
  }
  return targetReturns;
}

/**
 * Sum one numeric field from a list of objects.
 * @param {Array<object>} items - Source list.
 * @param {string} field - Field name to sum.
 * @returns {number} Sum of field values.
 */
function sumByField(items, field) {
  return items.reduce((sum, item) => sum + item[field], 0);
}

/**
 * Get a percentile value from a sorted numeric array by linear interpolation.
 * @param {number[]} sortedValues - Sorted numeric values.
 * @param {number} p - Percentile from 0 to 100.
 * @returns {number} Interpolated percentile value.
 */
function interpolatePercentile(sortedValues, p) {
  if (sortedValues.length === 1) return sortedValues[0];
  const pos = (p / 100) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(pos);
  const upperIndex = Math.ceil(pos);
  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];
  const weight = pos - lowerIndex;
  return sortedValues[lowerIndex] + (sortedValues[upperIndex] - sortedValues[lowerIndex]) * weight;
}
