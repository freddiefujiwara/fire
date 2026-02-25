import { computed, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
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
  findFireMonthForMedianDepletion,
  generateAlgorithmExplanationSegments,
  DEFAULT_PENSION_CONFIG,
  calculateStartAgeAdjustmentRate,
} from "@/domain/fire";
import { encode, decode } from "@/domain/fire/url";
import FireSimulationTable from "@/components/FireSimulationTable.vue";
import FireSimulationChart from "@/components/FireSimulationChart.vue";
import {
  createMortgageOptions,
  fireDate,
  formatMonths,
  buildAnnualTableJson,
  buildConditionsAndAlgorithmJson,
  generateCsv,
} from "@/features/fireSimulator/formatters";

/**
 * Build all reactive state and actions used by the FIRE simulator page.
 * @param {void} _unused - This function does not take input.
 * @returns {object} View model fields and actions for the simulator UI.
 */
export function useFireSimulatorViewModel() {
  const router = useRouter();
  const route = useRoute();

  // Constants for auto-calculation
  const DEFAULT_BONUS_RATIO = 2.5; // 1M bonus / 400k income
  const DEFAULT_FIRST_YEAR_EXTRA_EXPENSE_RATIO = 0.1; // 10% of annual income for tax/social insurance spike

  // New Configuration State
  const householdType = ref("family"); // single, couple, family
  const userBirthDate = ref(DEFAULT_USER_BIRTH_DATE);
  const spouseBirthDate = ref(DEFAULT_SPOUSE_BIRTH_DATE);
  const dependentBirthDates = ref([DEFAULT_DEPENDENT_BIRTH_DATE]);
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
  const withdrawalRate = ref(4);
  const includeBonus = ref(true);
  const simulationEndAge = ref(100);

  const useMonteCarlo = ref(false);
  const monteCarloTrials = ref(1000);
  const monteCarloVolatility = ref(15);
  const monteCarloSeed = ref(123);
  const monteCarloTargetSuccessRate = ref(80);

  const initialAssets = computed(() => manualInitialRiskAssets.value + manualInitialCashAssets.value);
  const riskAssets = computed(() => manualInitialRiskAssets.value);
  const cashAssets = computed(() => manualInitialCashAssets.value);

  const manualMonthlyExpense = ref(300000);
  const manualRegularMonthlyIncome = ref(400000);

  const manualAnnualBonus = ref(manualRegularMonthlyIncome.value * DEFAULT_BONUS_RATIO);
  const isAnnualBonusManual = ref(false);

  const manualPostFireFirstYearExtraExpense = ref(
    Math.round(((manualRegularMonthlyIncome.value * 12 + manualAnnualBonus.value) * DEFAULT_FIRST_YEAR_EXTRA_EXPENSE_RATIO) / 10000) * 10000,
  );
  const isPostFireFirstYearExtraExpenseManual = ref(false);

  const mortgageMonthlyPayment = ref(0);
  const mortgagePayoffDate = ref("");

  const monteCarloResults = ref(null);

  // URL State Sync
  const stateToSync = {
    ht: householdType,
    ubd: userBirthDate,
    sbd: spouseBirthDate,
    dbds: dependentBirthDates,
    ia: independenceAge,
    pc: pensionConfig,
    mira: manualInitialRiskAssets,
    mica: manualInitialCashAssets,
    mi: monthlyInvestment,
    arr: annualReturnRate,
    ii: includeInflation,
    ir: inflationRate,
    it: includeTax,
    tr: taxRate,
    pfee: postFireExtraExpense,
    rlsaf: retirementLumpSumAtFire,
    mpffyee: manualPostFireFirstYearExtraExpense,
    mpffyeem: isPostFireFirstYearExtraExpenseManual,
    wr: withdrawalRate,
    ib: includeBonus,
    sea: simulationEndAge,
    umc: useMonteCarlo,
    mct: monteCarloTrials,
    mcv: monteCarloVolatility,
    mcs: monteCarloSeed,
    mctsr: monteCarloTargetSuccessRate,
    mme: manualMonthlyExpense,
    mrmi: manualRegularMonthlyIncome,
    mab: manualAnnualBonus,
    mabm: isAnnualBonusManual,
    mmp: mortgageMonthlyPayment,
    mpd: mortgagePayoffDate,
  };

  /**
   * Get the default state values as a plain object.
   * @returns {object} Default state.
   */
  const getDefaultState = () => ({
    ht: "family",
    ubd: DEFAULT_USER_BIRTH_DATE,
    sbd: DEFAULT_SPOUSE_BIRTH_DATE,
    dbds: [DEFAULT_DEPENDENT_BIRTH_DATE],
    ia: 24,
    pc: {
      ...DEFAULT_PENSION_CONFIG,
      pensionDataAge: calculateAge(DEFAULT_USER_BIRTH_DATE),
      basicReduction: 1.0,
      earlyReduction: calculateStartAgeAdjustmentRate(65),
    },
    mira: 20000000,
    mica: 5000000,
    mi: 100000,
    arr: 5,
    ii: true,
    ir: 2,
    it: true,
    tr: 20.315,
    pfee: 60000,
    rlsaf: 5000000,
    mpffyee: 580000,
    mpffyeem: false,
    wr: 4,
    ib: true,
    sea: 100,
    umc: false,
    mct: 1000,
    mcv: 15,
    mcs: 123,
    mctsr: 80,
    mme: 300000,
    mrmi: 400000,
    mab: 1000000,
    mabm: false,
    mmp: 0,
    mpd: "",
  });

  /**
   * Reset all reactive variables to their initial default values.
   */
  const resetToDefault = () => {
    const defaults = getDefaultState();
    Object.entries(stateToSync).forEach(([key, refVar]) => {
      refVar.value = defaults[key];
    });
    if (monteCarloResults) {
      monteCarloResults.value = null;
    }
  };

  /**
   * Load state values from the compressed URL parameter.
   * @param {string|null} p - The compressed state string from the URL.
   */
  const loadFromUrl = (p) => {
    if (!p) {
      resetToDefault();
      return;
    }
    const decoded = decode(p);
    if (!decoded) return;

    Object.entries(stateToSync).forEach(([key, refVar]) => {
      if (decoded[key] !== undefined) {
        if (key === "pc") {
          refVar.value = { ...refVar.value, ...decoded[key] };
        } else {
          refVar.value = decoded[key];
        }
      }
    });

    if (decoded.pc?.pensionDataAge === undefined) {
      pensionConfig.value.pensionDataAge = currentAge.value;
    }
    if (decoded.pc?.basicReduction === undefined) {
      pensionConfig.value.basicReduction = 1.0;
    }
    if (decoded.pc?.earlyReduction === undefined) {
      pensionConfig.value.earlyReduction = calculateStartAgeAdjustmentRate(pensionConfig.value.userStartAge);
    }
    if ((!decoded.dbds || decoded.dbds.length === 0) && decoded.dbd) {
      dependentBirthDates.value = [decoded.dbd];
    }
    if (!Array.isArray(dependentBirthDates.value)) {
      dependentBirthDates.value = [DEFAULT_DEPENDENT_BIRTH_DATE];
    }
    dependentBirthDates.value = dependentBirthDates.value.filter(Boolean).slice(0, 3);
  };

  loadFromUrl(route.params.p);

  watch(
    () => route.params.p,
    (newP) => {
      // Avoid redundant loading if the state watcher just updated the URL
      const currentState = {};
      Object.entries(stateToSync).forEach(([key, refVar]) => {
        currentState[key] = refVar.value;
      });
      if (newP !== encode(currentState)) {
        loadFromUrl(newP);
      }
    },
  );

  /**
   * Add one dependent birth date field when there is room.
   * @param {void} _unused - This function does not take input.
   * @returns {void} Nothing is returned.
   */
  const addDependentBirthDate = () => {
    if (dependentBirthDates.value.length >= 3) return;
    dependentBirthDates.value.push(DEFAULT_DEPENDENT_BIRTH_DATE);
  };

  /**
   * Remove one dependent birth date by index.
   * @param {number} index - Position to remove.
   * @returns {void} Nothing is returned.
   */
  const removeDependentBirthDate = (index) => {
    if (dependentBirthDates.value.length <= 1) return;
    dependentBirthDates.value.splice(index, 1);
  };

  watch(manualRegularMonthlyIncome, (newVal) => {
    if (!isAnnualBonusManual.value) {
      manualAnnualBonus.value = newVal * DEFAULT_BONUS_RATIO;
    }
  });

  watch([manualRegularMonthlyIncome, manualAnnualBonus], ([newIncome, newBonus]) => {
    if (!isPostFireFirstYearExtraExpenseManual.value) {
      const annualIncome = newIncome * 12 + newBonus;
      manualPostFireFirstYearExtraExpense.value = Math.round((annualIncome * DEFAULT_FIRST_YEAR_EXTRA_EXPENSE_RATIO) / 10000) * 10000;
    }
  });

  const DEFAULT_ENCODED_STATE = encode(getDefaultState());

  watch(
    () => {
      const state = {};
      Object.entries(stateToSync).forEach(([key, refVar]) => {
        state[key] = refVar.value;
      });
      return state;
    },
    (newState) => {
      const encoded = encode(newState);
      if (encoded === route.params.p) return;

      if (!route.params.p && encoded === DEFAULT_ENCODED_STATE) {
        return;
      }

      router.replace({
        params: { p: encoded },
      });
    },
    { deep: true },
  );

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
    pensionConfig: pensionConfig.value,
    dependentBirthDate: householdType.value === "family" ? (dependentBirthDates.value[0] || null) : null,
    dependentBirthDates: householdType.value === "family" ? dependentBirthDates.value.filter(Boolean).slice(0, 3) : [],
    independenceAge: independenceAge.value,
    householdType: householdType.value,
    simulationEndAge: simulationEndAge.value,
  }));

  const growthData = computed(() => generateGrowthTable(simulationParams.value));
  const annualSimulationData = computed(() => generateAnnualSimulation(simulationParams.value));

  const fireAchievementMonth = computed(() => growthData.value.fireReachedMonth);
  const fireAchievementAge = computed(() => Math.floor(currentAge.value + fireAchievementMonth.value / 12));
  const pensionEstimateAge = computed(() => {
    const userStart = pensionConfig.value.userStartAge;
    if (!pensionConfig.value.includeSpouse || householdType.value === "single") {
      return userStart;
    }
    return Math.max(userStart, pensionConfig.value.spouseUserAgeStart);
  });
  const pensionAnnualAtFire = computed(() => calculateMonthlyPension(pensionEstimateAge.value, fireAchievementAge.value, pensionConfig.value) * 12);
  const estimatedMonthlyPensionAtStartAge = computed(() => calculateMonthlyPension(pensionEstimateAge.value, fireAchievementAge.value, pensionConfig.value));
  const pensionParticipationEndAge = computed(() => Math.min(60, fireAchievementAge.value));
  const pensionFutureYears = computed(() => pensionParticipationEndAge.value - pensionConfig.value.pensionDataAge);
  const pensionProjectedAnnual = computed(() =>
    pensionConfig.value.userKoseiAccruedAtDataAgeAnnualYen
    + pensionConfig.value.userKoseiFutureFactorAnnualYenPerYear * pensionFutureYears.value,
  );

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

  const dependentIndependenceAges = computed(() => {
    if (householdType.value !== "family") return [];
    return dependentBirthDates.value
      .filter(Boolean)
      .slice(0, 3)
      .map((birthDate, index) => {
        const birth = new Date(birthDate);
        if (Number.isNaN(birth.getTime())) return null;
        return {
          age: calculateAge(userBirthDate.value, new Date(birth.getFullYear() + independenceAge.value, 3, 1)),
          label: `子${index + 1}の独立`,
        };
      })
      .filter(Boolean);
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
    dependentIndependenceAges.value.forEach((item) => list.push(item));
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
      dependentBirthDate: householdType.value === "family" ? (dependentBirthDates.value[0] || null) : null,
      dependentBirthDates: householdType.value === "family" ? dependentBirthDates.value.filter(Boolean).slice(0, 3) : [],
      independenceAge: independenceAge.value,
      householdType: householdType.value,
      pensionConfig: pensionConfig.value,
      pensionParticipationEndAge: pensionParticipationEndAge.value,
      pensionFutureYears: pensionFutureYears.value,
      pensionProjectedAnnual: pensionProjectedAnnual.value,
      simulationEndAge: simulationEndAge.value,
    }),
  );

  const algorithmExplanationFull = computed(() => algorithmExplanationSegments.value.map((seg) => seg.value).join(""));

  const isCalculatingMonteCarlo = ref(false);

  /**
   * Run Monte Carlo simulation when enabled and store the result.
   * @param {void} _unused - This function does not take input.
   * @returns {void} Nothing is returned.
   */
  const runMonteCarlo = () => {
    if (!useMonteCarlo.value) {
      monteCarloResults.value = null;
      return;
    }
    isCalculatingMonteCarlo.value = true;
    setTimeout(() => {
      const targetRate = Math.min(0.99, Math.max(0.01, (Number(monteCarloTargetSuccessRate.value) || 0) / 100));
      const totalMonths = Math.max(0, Math.floor((simulationEndAge.value - currentAge.value) * 12));
      const simOptions = {
        trials: monteCarloTrials.value,
        annualVolatility: monteCarloVolatility.value / 100,
        seed: monteCarloSeed.value,
      };

      const evaluateAtMonth = (month) => runMonteCarloSimulation(simulationParams.value, {
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

      const terminalDepletionPlan = findFireMonthForMedianDepletion(simulationParams.value, {
        ...simOptions,
        targetTerminalAssets: 0,
        toleranceYen: 500000,
        minFireMonth: 0,
        maxFireMonth: totalMonths,
      });

      if (recommendedMonth === -1) {
        monteCarloResults.value = {
          ...recommendedResult,
          targetSuccessRate: targetRate,
          recommendedFireMonth: -1,
          recommendedFireAge: null,
          terminalDepletionPlan,
        };
      } else {
        monteCarloResults.value = {
          ...recommendedResult,
          targetSuccessRate: targetRate,
          recommendedFireMonth: recommendedMonth,
          recommendedFireAge: Math.floor(currentAge.value + recommendedMonth / 12),
          terminalDepletionPlan,
        };
      }
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
    mortgageMonthlyPaymentYen: mortgageMonthlyPayment.value,
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
    spouseBirthDate: householdType.value === "single" ? null : spouseBirthDate.value,
    dependentBirthDates: dependentBirthDates.value.filter(Boolean).slice(0, 3),
    pensionConfig: pensionConfig.value,
  }));

  /**
   * Build a formatted JSON string for conditions and algorithm text.
   * @param {void} _unused - This function does not take input.
   * @returns {string} Pretty JSON text for copy action.
   */
  const copyConditionsAndAlgorithm = () =>
    JSON.stringify(
      buildConditionsAndAlgorithmJson({
        conditions: conditionsPayload.value,
        monteCarloResults: monteCarloResults.value,
        monteCarloVolatility: monteCarloVolatility.value,
        monteCarloSeed: monteCarloSeed.value,
        estimatedMonthlyPensionAtStartAge: estimatedMonthlyPensionAtStartAge.value,
        pensionAnnualAtFire: pensionAnnualAtFire.value,
        pensionEstimateAge: pensionEstimateAge.value,
        fireAchievementAge: fireAchievementAge.value,
        algorithmExplanation: algorithmExplanationFull.value,
      }),
      null,
      2,
    );

  /**
   * Build a formatted JSON string for the annual table.
   * @param {void} _unused - This function does not take input.
   * @returns {string} Pretty JSON text for copy action.
   */
  const copyAnnualTable = () => JSON.stringify(buildAnnualTableJson(annualSimulationData.value), null, 2);

  /**
   * Generate and download the annual table as a CSV file.
   * @param {void} _unused - This function does not take input.
   * @returns {Promise<void>} Resolves after the download flow finishes.
   */
  async function downloadAnnualTableCsv() {
    const data = annualSimulationData.value;
    if (!data || data.length === 0) return;

    const csv = generateCsv(data);
    const fileName = `fire_simulation_${new Date().toISOString().split('T')[0]}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

    await triggerDownload(blob, fileName, csv);
  }

  /**
   * Check if the current browser looks like Safari.
   * @param {void} _unused - This function does not take input.
   * @returns {boolean} True when user agent matches Safari rules.
   */
  function isLikelySafari() {
    const ua = navigator.userAgent;
    return /^((?!chrome|android).)*safari/i.test(ua);
  }

  /**
   * Check if the current device looks like iOS.
   * @param {void} _unused - This function does not take input.
   * @returns {boolean} True when platform looks like iOS.
   */
  function isIOS() {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /**
   * Try share or fallback download for the CSV file.
   * @param {Blob} blob - File data blob.
   * @param {string} fileName - Name of the file to save.
   * @param {string} csvText - Raw CSV text used for Safari fallback.
   * @returns {Promise<void>} Resolves when download flow completes.
   */
  async function triggerDownload(blob, fileName, csvText) {
    const file = new File([blob], fileName, { type: 'text/csv;charset=utf-8' });

    // Try Web Share API first (especially for mobile)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: fileName,
        });
        return;
      } catch (err) {
        // If user cancelled, just return
        if (err.name === 'AbortError') return;
        // Otherwise fall back to traditional download
        console.error('Share failed, falling back to download', err);
      }
    }

    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
      return;
    }

    if (isIOS() && isLikelySafari()) {
      const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvText)}`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.target = '_self';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');

    link.style.position = 'fixed';
    link.style.left = '0';
    link.style.top = '0';
    link.style.opacity = '0';
    link.style.pointerEvents = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 15000);
  }

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
    simulationEndAge,
    useMonteCarlo,
    monteCarloTrials,
    monteCarloVolatility,
    monteCarloSeed,
    monteCarloTargetSuccessRate,
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
    estimatedMonthlyPensionAtStartAge,
    pensionParticipationEndAge,
    pensionFutureYears,
    pensionProjectedAnnual,
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
    downloadAnnualTableCsv,
    mortgageOptions: computed(() => createMortgageOptions()),
    // New exports
    householdType,
    userBirthDate,
    spouseBirthDate,
    dependentBirthDates,
    independenceAge,
    pensionConfig,
    manualInitialRiskAssets,
    manualInitialCashAssets,
    isAnnualBonusManual,
    isPostFireFirstYearExtraExpenseManual,
    addDependentBirthDate,
    removeDependentBirthDate,
  };
}
