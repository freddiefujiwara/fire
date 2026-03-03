<script setup>
import { computed, ref, watch } from "vue";
import { useFireSimulatorViewModel } from "@/features/fireSimulator/useFireSimulatorViewModel";
import NumericInput from "@/components/NumericInput.vue";
import { useUiStore } from "@/stores/ui";

const {
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
  withdrawalStrategy,
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
  annualCashflowSurplus,
  annualSavings,
  postFireFirstYearExtraExpense,
  annualSimulationData,
  fireAchievementMonth,
  fireAchievementAge,
  estimatedMonthlyPensionAtStartAge,
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
  microCorpLink,
  downloadAnnualTableCsv,
  mortgagePayoffAge,
  dependentIndependenceAges,
  // New exports
  householdType,
  userBirthDate,
  spouseBirthDate,
  dependentBirthDates,
  independenceAge,
  addDependentBirthDate,
  removeDependentBirthDate,
  pensionConfig,
  manualInitialRiskAssets,
  manualInitialCashAssets,
  isAnnualBonusManual,
  isPostFireFirstYearExtraExpenseManual,
} = useFireSimulatorViewModel();

const uiStore = useUiStore();
const isPrivacyMode = computed(() => uiStore.privacyMode);

const openMicroCorpSimulation = () => {
  if (isPrivacyMode.value) return;
  window.open(microCorpLink.value, "_blank", "noopener,noreferrer");
};

const simulationEndAgePreview = ref(simulationEndAge.value);

watch(simulationEndAge, (newAge) => {
  simulationEndAgePreview.value = newAge;
});

const onSimulationEndAgeInput = (event) => {
  simulationEndAgePreview.value = Number(event.target.value);
};

const commitSimulationEndAge = () => {
  simulationEndAge.value = simulationEndAgePreview.value;
};

const monteCarloTargetSuccessRatePreview = ref(monteCarloTargetSuccessRate.value);

const basicReductionPreview = ref(Math.round((pensionConfig.value.basicReduction ?? 1) * 100));

watch(monteCarloTargetSuccessRate, (newRate) => {
  monteCarloTargetSuccessRatePreview.value = newRate;
});

const onMonteCarloTargetSuccessRateInput = (event) => {
  monteCarloTargetSuccessRatePreview.value = Number(event.target.value);
};

const commitMonteCarloTargetSuccessRate = () => {
  monteCarloTargetSuccessRate.value = monteCarloTargetSuccessRatePreview.value;
};

watch(
  () => pensionConfig.value.basicReduction,
  (newBasicReduction) => {
    basicReductionPreview.value = Math.round((newBasicReduction ?? 1) * 100);
  },
);

const onBasicReductionInput = (event) => {
  basicReductionPreview.value = Number(event.target.value);
};

const commitBasicReduction = () => {
  pensionConfig.value.basicReduction = basicReductionPreview.value / 100;
};
</script>

<template>
  <section>
    <div class="filter-section table-wrap">
      <h3 class="section-title">基本設定 (家族・資産)</h3>
      <div class="fire-form-grid">
        <div class="filter-item">
          <label>世帯構成</label>
          <select v-model="householdType" class="date-select">
            <option value="single">単身</option>
            <option value="couple">夫婦</option>
            <option value="family">家族 (子あり)</option>
          </select>
        </div>
        <div class="filter-item">
          <label>生年月日 (本人)</label>
          <input v-model.lazy="userBirthDate" type="date" />
        </div>
        <div class="filter-item" v-if="householdType !== 'single'">
          <label>生年月日 (配偶者)</label>
          <input v-model.lazy="spouseBirthDate" type="date" />
        </div>
        <div class="filter-item" v-if="householdType === 'family'">
          <label>生年月日 (子)</label>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div v-for="(birthDate, idx) in dependentBirthDates" :key="idx" style="display: flex; gap: 8px; align-items: center;">
              <input v-model.lazy="dependentBirthDates[idx]" type="date" />
              <button type="button" class="pill-btn" v-if="dependentBirthDates.length > 1" @click="removeDependentBirthDate(idx)">削除</button>
            </div>
            <button type="button" class="pill-btn" v-if="dependentBirthDates.length < 3" @click="addDependentBirthDate">子を追加</button>
          </div>
        </div>
        <div class="filter-item">
          <label for="risk-assets">初期リスク資産 (円)</label>
          <NumericInput id="risk-assets" v-model.lazy="manualInitialRiskAssets" :step="1000000" />
        </div>
        <div class="filter-item">
          <label for="cash-assets">初期現金資産 (円)</label>
          <NumericInput id="cash-assets" v-model.lazy="manualInitialCashAssets" :step="1000000" />
        </div>
      </div>

      <details style="margin-top: 10px;">
        <summary style="font-size: 0.8rem; cursor: pointer; color: var(--muted);">詳細設定</summary>
        <div class="fire-form-grid" style="margin-top: 10px;">
          <div class="filter-item">
            <label>年金開始年齢 (本人)</label>
            <NumericInput v-model.lazy="pensionConfig.userStartAge" />
          </div>
          <div class="filter-item" v-if="householdType !== 'single'">
            <label>配偶者年金開始 (本人年齢)</label>
            <NumericInput v-model.lazy="pensionConfig.spouseUserAgeStart" />
          </div>
          <div class="filter-item">
            <label>厚生年金既発生額 (年額)</label>
            <NumericInput v-model.lazy="pensionConfig.userKoseiAccruedAtDataAgeAnnualYen" :step="10000" />
          </div>
          <div class="filter-item">
            <label>基礎年金反映率 ({{ basicReductionPreview }}%)</label>
            <input
              :value="basicReductionPreview"
              @input="onBasicReductionInput"
              @change="commitBasicReduction"
              @blur="commitBasicReduction"
              type="range"
              min="0"
              max="100"
              step="1"
              class="is-public"
            />
            <small class="meta">*未納期間がある場合等に設定してください</small>
          </div>
          <div class="filter-item">
            <label>今後の厚生年金増分 (年額/年)</label>
            <NumericInput v-model.lazy="pensionConfig.userKoseiFutureFactorAnnualYenPerYear" :step="1000" />
          </div>
          <div class="filter-item">
            <label>データ基準年 (本人年齢)</label>
            <NumericInput v-model.lazy="pensionConfig.pensionDataAge" />
          </div>
          <div class="filter-item" v-if="householdType !== 'single'" style="flex-direction: row; align-items: center; gap: 8px;">
             <input type="checkbox" v-model="pensionConfig.includeSpouse" id="includeSpouse" />
             <label for="includeSpouse" style="margin: 0;">配偶者の基礎年金を合算</label>
          </div>
          <div class="filter-item" v-if="householdType === 'family'">
            <label>子の独立年齢</label>
            <input v-model.lazy.number="independenceAge" type="number" />
          </div>
          <div class="filter-item">
            <label>期待リターン (年率 %)</label>
            <input v-model.lazy.number="annualReturnRate" type="number" step="0.1" class="is-public" />
          </div>
          <div class="filter-item">
            <label>取り崩し率 (%)</label>
            <input v-model.lazy.number="withdrawalRate" type="number" step="0.1" class="is-public" />
          </div>
          <div class="filter-item">
            <label>取り崩し方式</label>
            <select v-model="withdrawalStrategy" class="date-select">
              <option value="floor_by_rate">不足分 or 資産×率（大きい方）</option>
              <option value="shortfall_with_rate_cap">不足分のみ（資産×率を上限）</option>
            </select>
          </div>
          <div class="filter-item expense-item">
            <div class="label-row">
              <label>ボーナス (年額)</label>
              <div class="toggle-group">
                <label class="auto-toggle is-public">
                  <input type="checkbox" v-model="includeBonus" class="is-public" /> ボーナスを考慮
                </label>
              </div>
            </div>
            <NumericInput v-model.lazy="manualAnnualBonus" :step="10000" :disabled="!includeBonus" @input="isAnnualBonusManual = true" />
          </div>
          <div class="filter-item">
            <label>住宅ローン月額 (円)</label>
            <NumericInput v-model.lazy="mortgageMonthlyPayment" :step="10000" />
          </div>
          <div class="filter-item">
            <label>ローン完済年月</label>
            <input v-model.lazy="mortgagePayoffDate" type="month" class="date-select" />
          </div>
          <div class="filter-item">
            <label class="is-public">インフレ考慮</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="checkbox" v-model="includeInflation" class="is-public" />
              <input v-if="includeInflation" v-model.lazy.number="inflationRate" type="number" step="0.1" style="width: 60px;" class="is-public" />
              <span v-if="includeInflation" class="is-public">%</span>
            </div>
          </div>
          <div class="filter-item">
            <label class="is-public">税金考慮</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="checkbox" v-model="includeTax" class="is-public" />
              <input v-if="includeTax" v-model.lazy.number="taxRate" type="number" step="0.1" style="width: 80px;" class="is-public" />
              <span v-if="includeTax" class="is-public">%</span>
            </div>
          </div>
          <div class="filter-item">
            <label>FIRE後の社会保険料・税(月額)</label>
            <NumericInput v-model.lazy="postFireExtraExpense" :step="5000" />
          </div>
          <div class="filter-item expense-item">
            <div class="label-row">
              <label>FIRE達成時の退職金 (円)</label>
            </div>
            <NumericInput v-model.lazy="retirementLumpSumAtFire" :step="100000" />
          </div>
          <div class="filter-item expense-item">
            <div class="label-row">
              <label>FIRE1年目の追加支出 (年額)</label>
            </div>
            <NumericInput v-model.lazy="manualPostFireFirstYearExtraExpense" :step="100000" @input="isPostFireFirstYearExtraExpenseManual = true" />
          </div>
          <div class="filter-item">
            <label>資産寿命の目標年齢 ({{ simulationEndAgePreview }}歳)</label>
            <input :value="simulationEndAgePreview" @input="onSimulationEndAgeInput" @change="commitSimulationEndAge" @blur="commitSimulationEndAge" type="range" min="80" max="100" step="1" class="is-public" />
          </div>
        </div>
      </details>

      <h3 class="section-title" style="margin-top: 24px;">シミュレーション引数</h3>
      <div class="fire-form-grid">
        <div class="filter-item">
          <label>毎月の投資額 (円)</label>
          <NumericInput v-model.lazy="monthlyInvestment" :step="10000" />
        </div>
        <div class="filter-item expense-item">
          <div class="label-row">
            <label>生活費 (月額)</label>
          </div>
          <NumericInput v-model.lazy="manualMonthlyExpense" :step="10000" />
        </div>
        <div class="filter-item expense-item">
          <div class="label-row">
            <label>定期収入 (月額)</label>
          </div>
          <NumericInput v-model.lazy="manualRegularMonthlyIncome" :step="10000" />
        </div>
      </div>

      <div class="monte-carlo-settings" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border);">
        <h4 style="font-size: 0.9rem; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          🎲 順序リスク評価 (モンテカルロ法)
          <label class="auto-toggle is-public">
            <input type="checkbox" v-model="useMonteCarlo" class="is-public" id="useMonteCarloCheckbox" /> 有効にする
          </label>
        </h4>
        <div v-if="useMonteCarlo" class="fire-form-grid">
          <div class="filter-item">
            <label>試行回数</label>
            <input v-model.lazy.number="monteCarloTrials" type="number" step="100" min="100" max="10000" />
          </div>
          <div class="filter-item">
            <label>年率ボラティリティ (%)</label>
            <input v-model.lazy.number="monteCarloVolatility" type="number" step="1" min="0" />
          </div>
          <div class="filter-item">
            <label>乱数シード (再現用)</label>
            <input v-model.lazy.number="monteCarloSeed" type="number" />
          </div>
          <div class="filter-item">
            <label>目標FIRE成功率 ({{ monteCarloTargetSuccessRatePreview }}%)</label>
            <input :value="monteCarloTargetSuccessRatePreview" @input="onMonteCarloTargetSuccessRateInput" @change="commitMonteCarloTargetSuccessRate" @blur="commitMonteCarloTargetSuccessRate" type="range" min="1" max="99" step="1" class="is-public" />
          </div>
        </div>
        <div v-if="useMonteCarlo" class="monte-carlo-actions">
          <button
            @click="runMonteCarlo"
            class="pill-btn"
            :disabled="isCalculatingMonteCarlo"
          >
            {{ isCalculatingMonteCarlo ? '⚡ 計算中...' : '🎲 モンテカルロ試行を実行' }}
          </button>
        </div>
      </div>

      <div class="copy-actions">
        <button
          type="button"
          class="pill-btn"
          :disabled="isPrivacyMode"
          :title="isPrivacyMode ? '閲覧するにはモザイクを解除してください' : ''"
          style="text-decoration: none;"
          @click="openMicroCorpSimulation"
        >
          マイクロ法人シミュレーション
        </button>
        <CopyButton
          label="📋 条件とアルゴリズムをコピー"
          :copy-value="copyConditionsAndAlgorithm"
          disabled-on-privacy
        />
      </div>

      <div class="initial-summary">
        <details>
          <summary>シミュレーション設定内容の確認 (全パラメータ)</summary>
          <div class="initial-summary-grid">
            <div class="summary-group">
              <h4 class="summary-group-title">基本情報・家族</h4>
              <div class="summary-item">
                <span class="meta">世帯構成:</span>
                <span>{{ householdType === 'single' ? '単身' : householdType === 'couple' ? '夫婦' : '家族 (子あり)' }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">本人生年月日:</span>
                <span>{{ userBirthDate }} (現在{{ currentAge }}歳)</span>
              </div>
              <div class="summary-item" v-if="householdType !== 'single'">
                <span class="meta">配偶者生年月日:</span>
                <span>{{ spouseBirthDate }}</span>
              </div>
              <div class="summary-item" v-if="householdType === 'family'">
                <span class="meta">子の生年月日:</span>
                <span>{{ dependentBirthDates.join(', ') }}</span>
              </div>
              <div class="summary-item" v-if="householdType === 'family'">
                <span class="meta">子の独立年齢:</span>
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                  <span>{{ independenceAge }}歳</span>
                  <div v-for="(item, idx) in dependentIndependenceAges" :key="idx">
                    <small class="meta">{{ item.label }}: 本人{{ item.age }}歳時</small>
                  </div>
                </div>
              </div>
              <div class="summary-item">
                <span class="meta">資産寿命の目標年齢:</span>
                <span>{{ simulationEndAge }}歳</span>
              </div>
            </div>

            <div class="summary-group">
              <h4 class="summary-group-title">資産・収支</h4>
              <div class="summary-item">
                <span class="meta">初期リスク資産:</span>
                <span class="amount-value">{{ formatYen(manualInitialRiskAssets) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">初期現金資産:</span>
                <span class="amount-value">{{ formatYen(manualInitialCashAssets) }}</span>
              </div>
              <div class="summary-item highlight-item">
                <span class="meta">総金融資産:</span>
                <span class="amount-value">{{ formatYen(initialAssets) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">毎月の投資額:</span>
                <span class="amount-value">{{ formatYen(monthlyInvestment) }}</span>
                <small class="meta">({{ formatYen(annualInvestment) }} / 年)</small>
              </div>
              <div class="summary-item">
                <span class="meta">生活防衛資金 (月数):</span>
                <span>{{ monthsOfCash.toFixed(1) }} ヶ月分</span>
              </div>
              <div class="summary-item">
                <span class="meta">生活費 (月額):</span>
                <span class="amount-value">{{ formatYen(manualMonthlyExpense) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">定期収入 (月額):</span>
                <span class="amount-value">{{ formatYen(manualRegularMonthlyIncome) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">ボーナス考慮:</span>
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                  <span>{{ includeBonus ? `あり (${formatYen(manualAnnualBonus)} / 年)` : 'なし' }}</span>
                  <small v-if="includeBonus && isAnnualBonusManual" class="meta">[手入力]</small>
                </div>
              </div>
              <div class="summary-item">
                <span class="meta">住宅ローン月額:</span>
                <span class="amount-value">{{ formatYen(mortgageMonthlyPayment) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">ローン完済年月:</span>
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                  <span>{{ mortgagePayoffDate || '設定なし' }}</span>
                  <small v-if="mortgagePayoffAge" class="meta">(本人{{ mortgagePayoffAge }}歳時)</small>
                </div>
              </div>
              <div class="summary-item">
                <span class="meta">FIRE時の退職金:</span>
                <span class="amount-value">{{ formatYen(retirementLumpSumAtFire) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">FIRE1年目の追加支出:</span>
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                  <span class="amount-value">{{ formatYen(manualPostFireFirstYearExtraExpense) }}</span>
                  <small v-if="isPostFireFirstYearExtraExpenseManual" class="meta">[手入力]</small>
                </div>
              </div>
              <div class="summary-item">
                <span class="meta">FIRE後社会保険料・税(月額):</span>
                <span class="amount-value">{{ formatYen(postFireExtraExpense) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">合計収入 (月額平均):</span>
                <span class="amount-value">{{ formatYen(monthlyIncome) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">年間収支剰余 (投資前):</span>
                <span class="amount-value">{{ formatYen(annualCashflowSurplus) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">年間現金増分 (投資後):</span>
                <span class="amount-value">{{ formatYen(annualSavings) }}</span>
              </div>
            </div>

            <div class="summary-group">
              <h4 class="summary-group-title">運用・シミュレーション条件</h4>
              <div class="summary-item">
                <span class="meta">期待リターン:</span>
                <span>{{ annualReturnRate }}%</span>
              </div>
              <div class="summary-item">
                <span class="meta">取り崩し率:</span>
                <span>{{ withdrawalRate }}%</span>
              </div>
              <div class="summary-item">
                <span class="meta">取り崩し方式:</span>
                <span>{{ withdrawalStrategy === "shortfall_with_rate_cap" ? "不足分のみ（4%上限）" : "不足分 or 4%（大きい方）" }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">インフレ考慮:</span>
                <span>{{ includeInflation ? `あり (${inflationRate}%)` : 'なし' }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">税金考慮:</span>
                <span>{{ includeTax ? `あり (${taxRate}%)` : 'なし' }}</span>
              </div>
              <div class="summary-item highlight-item">
                <span class="meta">必要資産目安:</span>
                <span class="amount-value">{{ formatYen(requiredAssetsAtFire) }}</span>
                <small class="meta">({{ fireAchievementAge }}歳時点)</small>
              </div>
            </div>

            <div class="summary-group">
              <h4 class="summary-group-title">年金設定</h4>
              <div class="summary-item">
                <span class="meta">年金開始年齢 (本人):</span>
                <span>{{ pensionConfig.userStartAge }}歳</span>
              </div>
              <div class="summary-item" v-if="householdType !== 'single'">
                <span class="meta">配偶者年金開始 (本人年齢):</span>
                <span>{{ pensionConfig.spouseUserAgeStart }}歳</span>
              </div>
              <div class="summary-item">
                <span class="meta">厚生年金既発生額 (年額):</span>
                <span class="amount-value">{{ formatYen(pensionConfig.userKoseiAccruedAtDataAgeAnnualYen) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">基礎年金反映率:</span>
                <span>{{ Math.round((pensionConfig.basicReduction ?? 1) * 100) }}%</span>
              </div>
              <div class="summary-item">
                <span class="meta">厚生年金増分 (年額/年):</span>
                <span class="amount-value">{{ formatYen(pensionConfig.userKoseiFutureFactorAnnualYenPerYear) }}</span>
              </div>
              <div class="summary-item">
                <span class="meta">データ基準年 (本人年齢):</span>
                <span>{{ pensionConfig.pensionDataAge }}歳</span>
              </div>
              <div class="summary-item" v-if="householdType !== 'single'">
                <span class="meta">配偶者の基礎年金合算:</span>
                <span>{{ pensionConfig.includeSpouse ? 'あり' : 'なし' }}</span>
              </div>
              <div class="summary-item highlight-item">
                <span class="meta">年金受給見込み (月額):</span>
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                  <span class="amount-value">{{ formatYen(estimatedMonthlyPensionAtStartAge) }}</span>
                  <small class="meta">受給開始: {{ pensionConfig.userStartAge }}歳 / {{ fireAchievementAge }}歳でFIRE時</small>
                </div>
              </div>
            </div>

            <div class="summary-group">
              <h4 class="summary-group-title">モンテカルロ法設定</h4>
              <div class="summary-item">
                <span class="meta">順序リスク評価:</span>
                <span>{{ useMonteCarlo ? '有効' : '無効' }}</span>
              </div>
              <div class="summary-item" :style="{ opacity: useMonteCarlo ? 1 : 0.5 }">
                <span class="meta">試行回数:</span>
                <span>{{ monteCarloTrials }}回</span>
              </div>
              <div class="summary-item" :style="{ opacity: useMonteCarlo ? 1 : 0.5 }">
                <span class="meta">年率ボラティリティ:</span>
                <span>{{ monteCarloVolatility }}%</span>
              </div>
              <div class="summary-item" :style="{ opacity: useMonteCarlo ? 1 : 0.5 }">
                <span class="meta">乱数シード:</span>
                <span>{{ monteCarloSeed }}</span>
              </div>
              <div class="summary-item" :style="{ opacity: useMonteCarlo ? 1 : 0.5 }">
                <span class="meta">目標FIRE成功率:</span>
                <span>{{ monteCarloTargetSuccessRate }}%</span>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div class="initial-summary" style="margin-top: 0; border-top: none;">
        <details>
          <summary>FIREアルゴリズムの詳細</summary>
          <div class="algorithm-details" style="font-size: 0.8rem; color: var(--muted); margin-top: 10px; line-height: 1.6; white-space: pre-wrap;">
            <template v-for="(seg, idx) in algorithmExplanationSegments" :key="idx">
              <span v-if="seg.type === 'amount'" class="amount-value">{{ seg.value }}</span>
              <span v-else>{{ seg.value }}</span>
            </template>
          </div>
        </details>
      </div>
    </div>

    <div v-if="useMonteCarlo && monteCarloResults" class="card-grid monte-carlo-results">
      <article class="card highlight">
        <h2>逆算FIRE年齢 ({{ simulationEndAge }}歳生存)</h2>
        <p v-if="monteCarloResults.recommendedFireAge !== null" class="is-positive">
          {{ monteCarloResults.recommendedFireAge }}歳
        </p>
        <p v-else class="is-negative">条件内で達成不可</p>
        <p class="meta">目標成功率 {{ (monteCarloResults.targetSuccessRate * 100).toFixed(0) }}% 以上 / {{ monteCarloResults.trials }}回の試行結果</p>
      </article>
      <article class="card">
        <h2>最終資産・中央値 (P50)</h2>
        <p class="amount-value">{{ formatYen(monteCarloResults.p50) }}</p>
        <p class="meta">確率50%でこの額以上残る</p>
      </article>
      <article class="card">
        <h2>最終資産・下位10% (P10)</h2>
        <p class="amount-value" :class="monteCarloResults.p10 < 0 ? 'is-negative' : ''">
          {{ formatYen(monteCarloResults.p10) }}
        </p>
        <p class="meta">最悪ケースに近いシナリオ</p>
      </article>
      <article class="card">
        <h2>最終資産・上位10% (P90)</h2>
        <p class="amount-value">{{ formatYen(monteCarloResults.p90) }}</p>
        <p class="meta">好調な市場が続いた場合</p>
      </article>
      <article class="card" v-if="monteCarloResults.terminalDepletionPlan">
        <h2>P50で{{ simulationEndAge }}歳に使い切る目安FIRE年齢</h2>
        <p class="amount-value">{{ Math.floor(currentAge + monteCarloResults.terminalDepletionPlan.recommendedFireMonth / 12) }}歳</p>
        <p class="meta">
          このFIRE年齢で試算した場合の{{ simulationEndAge }}歳時点P50残高: {{ formatYen(monteCarloResults.terminalDepletionPlan.p50TerminalAssets) }}
        </p>
        <p class="meta">
          そのときの成功率: {{ (monteCarloResults.terminalDepletionPlan.successRate * 100).toFixed(1) }}%
          （= {{ simulationEndAge }}歳まで資産がマイナスにならない割合）
        </p>
        <p class="meta" v-if="monteCarloResults.terminalDepletionPlan.boundaryHit === 'low'">
          ※ 最短の0か月後FIREでも、P50残高はすでに0円付近以下です。支出を抑えるか、FIRE時期を後ろ倒ししてください。
        </p>
        <p class="meta" v-if="monteCarloResults.terminalDepletionPlan.boundaryHit === 'high'">
          ※ {{ simulationEndAge }}歳直前までFIREを遅らせても、P50残高を0円付近にできませんでした。
          期待リターン・支出・目標年齢もあわせて調整してください。
        </p>
      </article>
    </div>

    <div class="card-grid">
      <article class="card">
        <h2>FIRE達成まで</h2>
        <p class="is-positive">{{ formatMonths(fireAchievementMonth) }}</p>
        <p class="meta">達成予定: {{ fireDate(fireAchievementMonth) }}</p>
      </article>
      <article class="card">
        <h2>FIRE達成年齢</h2>
        <p class="is-positive">{{ fireAchievementAge }}歳</p>
        <p class="meta">現在{{ currentAge }}歳</p>
      </article>
      <article class="card">
        <h2>FIRE達成に必要な資産</h2>
        <p class="is-positive amount-value">{{ formatYen(requiredAssetsAtFire) }}</p>
        <p class="meta">
          あといくら必要か:
          <span class="amount-value">{{ formatYen(requiredAssetsAtFire - initialAssets) }}</span>
        </p>
      </article>
      <article class="card">
        <h2>設定された開始年齢での毎月の年金受給額（見込み）</h2>
        <p class="amount-value">{{ formatYen(estimatedMonthlyPensionAtStartAge) }}</p>
        <p class="meta">{{ fireAchievementAge }}歳でFIREした場合の概算</p>
      </article>
    </div>

    <div class="main-visualization">
      <FireSimulationChart :data="annualSimulationData" :annotations="chartAnnotations" :monte-carlo-paths="monteCarloResults" />
      <FireSimulationTable
        :data="annualSimulationData"
        :copy-value="copyAnnualTable"
        @download="downloadAnnualTableCsv"
      />
    </div>

  </section>
</template>

<style scoped>
.fire-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  align-items: flex-end;
}
.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-item label {
  font-size: 0.85rem;
  color: var(--muted);
}
.filter-item input[type="text"],
.filter-item input[type="number"],
.filter-item input[type="date"],
.filter-item input[type="month"],
.filter-item select,
.filter-item .date-select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--text);
  font: inherit;
}

.filter-item input::placeholder {
  color: color-mix(in oklab, var(--muted), #ffffff 20%);
  opacity: 0.5;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toggle-group {
  display: flex;
  gap: 8px;
  align-items: center;
}
.auto-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 0.75rem !important;
  color: var(--primary) !important;
}
.auto-toggle input {
  cursor: pointer;
}
.expense-breakdown {
  margin-top: 8px;
  background: var(--surface);
  border-radius: 4px;
  padding: 4px 8px;
  border: 1px solid var(--border);
}
.expense-breakdown summary {
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--muted);
  user-select: none;
}
.initial-summary {
  margin-top: 14px;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}
.initial-summary summary {
  font-size: 0.8rem;
  color: var(--muted);
  cursor: pointer;
}
.initial-summary-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}
.summary-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.summary-group-title {
  font-size: 0.8rem;
  font-weight: bold;
  margin-bottom: 4px;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 4px;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  gap: 8px;
}
.highlight-item {
  margin-top: 4px;
  padding: 6px 8px;
  background: color-mix(in oklab, var(--primary), transparent 92%);
  border-radius: 6px;
  border-left: 3px solid var(--primary);
}
.breakdown-content {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.75rem;
}
.breakdown-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed var(--border);
  padding-bottom: 2px;
}
.total-row {
  font-weight: bold;
  color: var(--primary);
  border-bottom: 1px solid var(--border);
}
.breakdown-divider {
  margin: 4px 0;
  border: none;
  border-top: 1px solid var(--border);
}
.special-info {
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--muted);
}
.card h2 {
    font-size: 0.9rem;
    color: var(--muted);
    margin-bottom: 8px;
}
.card p {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 4px 0;
}
.card.highlight {
    border: 2px solid var(--primary);
}
.main-visualization {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.copy-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 700px) {
  .copy-actions {
    justify-content: center;
  }
}

.table-copy-action {
  margin-top: 0;
  margin-bottom: -10px;
}

.monte-carlo-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.pill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
