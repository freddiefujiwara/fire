<script setup>
import { formatYen } from "@/domain/format";

defineProps({
  data: { type: Array, required: true },
});
</script>

<template>
  <div class="chart-card simulation-table-card">
    <h3 class="section-title">年齢別収支推移表</h3>
    <div class="table-wrapper">
      <table class="simulation-table">
        <thead>
          <tr>
            <th title="年度末時点の年齢。誕生月に基づき算出されます。">年齢</th>
            <th class="text-right" title="定期収入（給与等） + 年金受給額の合算です。">収入 (年金込)</th>
            <th class="text-right" title="年間支出 = (基本生活費 - 住宅ローン) × インフレ調整 + 住宅ローン(固定) + FIRE後追加支出（FIRE達成月より加算）">支出</th>
            <th class="text-right" title="当年中の運用リターン合計。月次複利で計算されます。">運用益(当年分)</th>
            <th class="text-right" title="資産取崩し額 = Max(0, Max(支出, 資産×取崩率) - 収入 - 年金) ※税金考慮時はグロスアップ算出">取り崩し額</th>
            <th class="text-right" title="金融資産(合計) = 貯金額(現金) + リスク資産額。100歳時点で0以上なら成功です。">金融資産(合計)</th>
            <th class="text-right" title="貯金額 = 前年末残高 + 当年収支(収入 - 支出) - 当年投資額 + リスク資産からの補填（純額）">貯金額</th>
            <th class="text-right" title="リスク資産額 = 前年末残高 + 投資額 + 運用益 - 取崩額(グロス)">リスク資産額</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data" :key="row.age">
            <td class="age-cell" title="年度末時点の年齢">{{ row.age }}歳</td>
            <td class="amount-value text-right" :title="`定期収入: ${formatYen(row.income)} + 年金: ${formatYen(row.pension)}` ">{{ formatYen(row.income + row.pension) }}</td>
            <td class="amount-value text-right" title="基本生活費（インフレ調整済） + 住宅ローン返済額 + FIRE後追加支出">{{ formatYen(row.expenses) }}</td>
            <td class="amount-value text-right is-positive" title="リスク資産 × 期待リターン（月次複利の12ヶ月分合計）">{{ formatYen(row.investmentGain) }}</td>
            <td class="amount-value text-right" :class="{ 'is-negative': row.withdrawal > 0 }" title="生活費の不足分、または取崩率ルールに基づく資産からの引出額（税金込）">
              {{ formatYen(row.withdrawal) }}
            </td>
            <td class="amount-value text-right" style="font-weight: bold;" title="貯金額（現金） + リスク資産額">{{ formatYen(row.assets) }}</td>
            <td class="amount-value text-right" :class="{ 'is-negative': row.cashAssets < 0 }" title="手元の現金残高。収入・支出・投資の結果、余った分（または不足分）を保持します。">{{ formatYen(row.cashAssets) }}</td>
            <td class="amount-value text-right" title="株式・投資信託等の評価額。運用益と積立・取崩が反映されます。">{{ formatYen(row.riskAssets) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.simulation-table-card {
  margin-top: 24px;
}
.table-wrapper {
  overflow-x: auto;
  margin: 0 -16px; /* Bleed on mobile if needed, but card has padding */
  padding: 0 16px;
}
.simulation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  white-space: nowrap;
}
.simulation-table th {
  text-align: left;
  padding: 12px 8px;
  border-bottom: 2px solid var(--border);
  color: var(--muted);
  font-weight: 600;
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}
.simulation-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
}
.text-right {
  text-align: right;
}
.age-cell {
  font-weight: 600;
  color: var(--text);
}
.is-negative {
  color: var(--negative);
}
.simulation-table tr:hover {
  background: var(--surface-elevated);
}

@media (max-width: 640px) {
  .simulation-table {
    font-size: 0.75rem;
  }
  .simulation-table th, .simulation-table td {
    padding: 8px 4px;
  }
}
</style>
