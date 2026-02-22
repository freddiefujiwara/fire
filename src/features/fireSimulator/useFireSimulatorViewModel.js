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
  generateAlgorithmExplanationSegments,
  DEFAULT_PENSION_CONFIG,
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

export function useFireSimulatorViewModel() {
  const router = useRouter();
  const route = useRoute();

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

  const useMonteCarlo = ref(false);
  const monteCarloTrials = ref(1000);
  const monteCarloVolatility = ref(15);
  const monteCarloSeed = ref(123);

  const initialAssets = computed(() => manualInitialRiskAssets.value + manualInitialCashAssets.value);
  const riskAssets = computed(() => manualInitialRiskAssets.value);
  const cashAssets = computed(() => manualInitialCashAssets.value);

  const manualMonthlyExpense = ref(300000);
  const manualRegularMonthlyIncome = ref(400000);

  // Constants for auto-calculation
  const DEFAULT_BONUS_RATIO = 2.5; // 1M bonus / 400k income
  const DEFAULT_FIRST_YEAR_EXTRA_EXPENSE_RATIO = 0.1; // 10% of annual income for tax/social insurance spike

  const manualAnnualBonus = ref(manualRegularMonthlyIncome.value * DEFAULT_BONUS_RATIO);
  const isAnnualBonusManual = ref(false);

  const manualPostFireFirstYearExtraExpense = ref(
    Math.round(((manualRegularMonthlyIncome.value * 12 + manualAnnualBonus.value) * DEFAULT_FIRST_YEAR_EXTRA_EXPENSE_RATIO) / 10000) * 10000,
  );
  const isPostFireFirstYearExtraExpenseManual = ref(false);

  const mortgageMonthlyPayment = ref(0);
  const mortgagePayoffDate = ref("");

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
    umc: useMonteCarlo,
    mct: monteCarloTrials,
    mcv: monteCarloVolatility,
    mcs: monteCarloSeed,
    mme: manualMonthlyExpense,
    mrmi: manualRegularMonthlyIncome,
    mab: manualAnnualBonus,
    mabm: isAnnualBonusManual,
    mmp: mortgageMonthlyPayment,
    mpd: mortgagePayoffDate,
  };

  const loadFromUrl = () => {
    const p = route.params.p;
    if (p) {
      const decoded = decode(p);
      if (decoded) {
        Object.entries(stateToSync).forEach(([key, refVar]) => {
          if (decoded[key] !== undefined) {
            if (key === "pc") {
              refVar.value = { ...refVar.value, ...decoded[key] };
            } else {
              refVar.value = decoded[key];
            }
          }
        });
        if ((!decoded.dbds || decoded.dbds.length === 0) && decoded.dbd) {
          dependentBirthDates.value = [decoded.dbd];
        }
      }
    }
  };

  loadFromUrl();
  if (!Array.isArray(dependentBirthDates.value)) {
    dependentBirthDates.value = [DEFAULT_DEPENDENT_BIRTH_DATE];
  }
  dependentBirthDates.value = dependentBirthDates.value.filter(Boolean).slice(0, 3);

  const addDependentBirthDate = () => {
    if (dependentBirthDates.value.length >= 3) return;
    dependentBirthDates.value.push(DEFAULT_DEPENDENT_BIRTH_DATE);
  };

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
    expenseBreakdown: null,
    pensionConfig: pensionConfig.value,
    dependentBirthDate: householdType.value === "family" ? (dependentBirthDates.value[0] || null) : null,
    dependentBirthDates: householdType.value === "family" ? dependentBirthDates.value.filter(Boolean).slice(0, 3) : [],
    independenceAge: independenceAge.value,
    householdType: householdType.value,
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
    dependentBirthDate: dependentBirthDates.value[0] || null,
    dependentBirthDates: dependentBirthDates.value.filter(Boolean).slice(0, 3),
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

  async function downloadAnnualTableCsv() {
    const data = annualSimulationData.value;
    if (!data || data.length === 0) return;

    const csv = generateCsv(data);
    const fileName = `fire_simulation_${new Date().toISOString().split('T')[0]}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

    // Try Web Share API (native on iOS/Android)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'text/csv' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'FIRE シミュレーション結果',
            text: '年齢別収支推移表',
          });
          return;
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
          }
        }
      }
    }

    // Fallback to traditional download
    triggerDownload(blob, fileName);
  }

  function isLikelySafari() {
    const ua = navigator.userAgent;
    return /^((?!chrome|android).)*safari/i.test(ua);
  }

  function isIOS() {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function triggerDownload(blob, fileName) {
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(blob, fileName);
      return;
    }

    if (isIOS() && isLikelySafari()) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const popup = window.open(reader.result, '_blank');
        if (!popup) {
          alert('ダウンロードを開始できませんでした。ブラウザのポップアップブロック設定をご確認ください。');
        }
      };
      reader.readAsDataURL(blob);
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');

    // For iOS Safari, the link sometimes needs to be in the DOM and visible (but hidden)
    link.style.position = 'fixed';
    link.style.left = '0';
    link.style.top = '0';
    link.style.opacity = '0';
    link.style.pointerEvents = 'none';

    document.body.appendChild(link);

    link.click();

    // Delay cleanup to ensure browser has started the download
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
