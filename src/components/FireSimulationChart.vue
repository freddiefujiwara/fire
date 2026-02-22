<script setup>
import { computed, ref } from "vue";
import { formatYen } from "@/domain/format";

const props = defineProps({
  data: { type: Array, required: true },
  annotations: { type: Array, default: () => [] },
  monteCarloPaths: { type: Object, default: null },
});

const chartContainerRef = ref(null);
const activeTooltip = ref(null);

const width = 800;
const height = 440;
const margin = { top: 80, right: 80, bottom: 60, left: 80 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const maxCashFlow = computed(() => {
  const vals = props.data.map(d => Math.max(d.income + d.pension + d.withdrawal, d.expenses));
  return Math.max(...vals, 1000000);
});

const maxAssets = computed(() => {
  const baseMax = Math.max(...props.data.map(d => d.assets), 10000000);
  if (!props.monteCarloPaths) return baseMax;

  const pMax = Math.max(
    ...(props.monteCarloPaths.p10Path || []),
    ...(props.monteCarloPaths.p50Path || []),
    ...(props.monteCarloPaths.p90Path || [])
  );
  return Math.max(baseMax, pMax);
});

const yScaleCash = (val) => {
  return innerHeight - (val / (maxCashFlow.value * 1.1)) * innerHeight;
};

const yScaleAssets = (val) => {
  return innerHeight - (val / (maxAssets.value * 1.1)) * innerHeight;
};

const xScale = (i) => (i * innerWidth) / Math.max(props.data.length - 1, 1);

const annotationPoints = computed(() => {
  const points = props.annotations.map(ann => {
    const index = props.data.findIndex(d => d.age === ann.age);
    if (index === -1) return null;
    return {
      x: xScale(index),
      label: ann.label,
      age: ann.age
    };
  }).filter(Boolean);

  // Sort by x to ensure consistent staggering for nearby events
  return points.sort((a, b) => a.x - b.x);
});

const bars = computed(() => {
  const step = innerWidth / Math.max(props.data.length - 1, 1);
  const barWidth = step * 0.6;
  return props.data.map((d, i) => {
    const x = xScale(i) - barWidth / 2;
    const y0 = yScaleCash(0);

    // Stack: Income -> Pension -> Withdrawal
    const hIncome = (d.income / (maxCashFlow.value * 1.1)) * innerHeight;
    const hPension = (d.pension / (maxCashFlow.value * 1.1)) * innerHeight;
    const hWithdrawal = (d.withdrawal / (maxCashFlow.value * 1.1)) * innerHeight;

    return {
      age: d.age,
      x,
      w: barWidth,
      income: { y: y0 - hIncome, h: hIncome, val: d.income },
      pension: { y: y0 - hIncome - hPension, h: hPension, val: d.pension },
      withdrawal: { y: y0 - hIncome - hPension - hWithdrawal, h: hWithdrawal, val: d.withdrawal },
      expenses: { y: yScaleCash(d.expenses), val: d.expenses }
    };
  });
});

const assetPath = computed(() => {
  if (props.data.length === 0) return "";
  const points = props.data.map((d, i) => `${xScale(i)},${yScaleAssets(d.assets)}`);
  return `M ${points.join(" L ")}`;
});

const p10Path = computed(() => {
  const pData = props.monteCarloPaths?.p10Path;
  if (!pData) return "";
  const points = pData.map((v, i) => `${xScale(i)},${yScaleAssets(v)}`);
  return `M ${points.join(" L ")}`;
});

const p50Path = computed(() => {
  const pData = props.monteCarloPaths?.p50Path;
  if (!pData) return "";
  const points = pData.map((v, i) => `${xScale(i)},${yScaleAssets(v)}`);
  return `M ${points.join(" L ")}`;
});

const p90Path = computed(() => {
  const pData = props.monteCarloPaths?.p90Path;
  if (!pData) return "";
  const points = pData.map((v, i) => `${xScale(i)},${yScaleAssets(v)}`);
  return `M ${points.join(" L ")}`;
});

const expensePath = computed(() => {
  if (props.data.length === 0) return "";
  const points = props.data.map((d, i) => `${xScale(i)},${yScaleCash(d.expenses)}`);
  return `M ${points.join(" L ")}`;
});

const xLabels = computed(() => {
  const labels = [];
  const step = Math.ceil(props.data.length / 10);
  for (let i = 0; i < props.data.length; i += step) {
    labels.push({
      x: xScale(i),
      text: `${props.data[i].age}歳`
    });
  }
  return labels;
});

const yLabelsCash = computed(() => {
  const max = maxCashFlow.value * 1.1;
  const labels = [];
  const step = Math.pow(10, Math.floor(Math.log10(max)) - 1) * 5;
  for (let val = 0; val <= max; val += step) {
    labels.push({
      y: yScaleCash(val),
      text: `${Math.round(val / 10000).toLocaleString()}万`
    });
  }
  return labels;
});

const yLabelsAssets = computed(() => {
  const max = maxAssets.value * 1.1;
  const labels = [];
  const step = Math.pow(10, Math.floor(Math.log10(max)) - 1) * 5;
  for (let val = 0; val <= max; val += step) {
    labels.push({
      y: yScaleAssets(val),
      text: `${Math.round(val / 10000).toLocaleString()}万`
    });
  }
  return labels;
});

const showTooltip = (event, item) => {
  const container = chartContainerRef.value;
  /* v8 ignore next */
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  activeTooltip.value = {
    ...item,
    x: Math.min(Math.max(x + 14, 8), rect.width - 150),
    y: Math.min(Math.max(y - 10, 8), rect.height - 100),
  };
};

const hideTooltip = () => {
  activeTooltip.value = null;
};
</script>

<template>
  <div class="chart-card">
    <h3 class="section-title">年齢別収支・資産推移</h3>
    <div ref="chartContainerRef" class="chart-container" style="position: relative; overflow-x: auto;">
      <svg :viewBox="`0 0 ${width} ${height}`" style="min-width: 600px; width: 100%; height: auto;">
        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <!-- Grid lines (Cash) -->
          <g v-for="label in yLabelsCash" :key="'c'+label.text" class="grid-line">
            <line x1="0" :y1="label.y" :x2="innerWidth" :y2="label.y" stroke="var(--border)" stroke-dasharray="4" />
            <text x="-10" :y="label.y" text-anchor="end" alignment-baseline="middle" font-size="10" fill="var(--muted)" class="fire-y-axis-label">
              {{ label.text }}
            </text>
          </g>

          <!-- Right Axis (Assets) -->
          <g v-for="label in yLabelsAssets" :key="'a'+label.text">
            <text :x="innerWidth + 10" :y="label.y" text-anchor="start" alignment-baseline="middle" font-size="10" fill="#3b82f6" class="fire-y-axis-label">
              {{ label.text }}
            </text>
          </g>

          <!-- Bars -->
          <g v-for="(b, i) in bars" :key="b.age">
            <!-- Work Income -->
            <rect :x="b.x" :y="b.income.y" :width="b.w" :height="b.income.h" fill="#10b981" opacity="0.7"
              @mouseenter="showTooltip($event, { age: b.age, label: '給与収入', value: b.income.val })" @mouseleave="hideTooltip" />
            <!-- Pension -->
            <rect :x="b.x" :y="b.pension.y" :width="b.w" :height="b.pension.h" fill="#f59e0b" opacity="0.7"
              @mouseenter="showTooltip($event, { age: b.age, label: '年金収入', value: b.pension.val })" @mouseleave="hideTooltip" />
            <!-- Withdrawal -->
            <rect :x="b.x" :y="b.withdrawal.y" :width="b.w" :height="b.withdrawal.h" fill="#ef4444" opacity="0.7"
              @mouseenter="showTooltip($event, { age: b.age, label: '資産取り崩し', value: b.withdrawal.val })" @mouseleave="hideTooltip" />
          </g>

          <!-- Expense Line -->
          <path :d="expensePath" fill="none" stroke="var(--text)" stroke-width="2" stroke-dasharray="2" />

          <!-- Asset Line (Deterministic) -->
          <path :d="assetPath" fill="none" stroke="#3b82f6" stroke-width="3" />

          <!-- Monte Carlo Lines -->
          <template v-if="props.monteCarloPaths">
            <path :d="p90Path" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="2" opacity="0.6" />
            <path :d="p50Path" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.8" />
            <path :d="p10Path" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2" opacity="0.6" />
          </template>

          <!-- Annotations (Vertical Lines) -->
          <g v-for="(ann, i) in annotationPoints" :key="ann.label + ann.age">
            <line :x1="ann.x" y1="0" :x2="ann.x" :y2="innerHeight" stroke="#8b5cf6" stroke-dasharray="4" stroke-width="1.5" />
            <text :x="ann.x" :y="-8 - (i % 4) * 14" text-anchor="middle" font-size="10" fill="#8b5cf6" font-weight="bold">
              {{ ann.label }}
            </text>
            <line :x1="ann.x" y1="0" :x2="ann.x" :y2="innerHeight" stroke="transparent" stroke-width="10" style="cursor: help;"
              @mouseenter="showTooltip($event, { age: ann.age, label: ann.label, isEvent: true })" @mouseleave="hideTooltip" />
          </g>

          <!-- Axes -->
          <line x1="0" :y1="innerHeight" :x2="innerWidth" :y2="innerHeight" stroke="var(--text)" />
          <line x1="0" y1="0" x2="0" :y2="innerHeight" stroke="var(--text)" />
          <line :x1="innerWidth" y1="0" :x2="innerWidth" :y2="innerHeight" stroke="#3b82f6" />

          <!-- X Labels -->
          <g v-for="label in xLabels" :key="label.text">
            <text :x="label.x" :y="innerHeight + 25" text-anchor="middle" font-size="12" fill="var(--muted)">
              {{ label.text }}
            </text>
          </g>
        </g>
      </svg>

      <div v-if="activeTooltip" class="tooltip" :style="{ left: `${activeTooltip.x}px`, top: `${activeTooltip.y}px` }">
        <div style="font-weight: bold; border-bottom: 1px solid var(--border); margin-bottom: 4px; padding-bottom: 2px;">
          {{ activeTooltip.age }}歳
        </div>
        <div v-if="activeTooltip.isEvent" style="color: #8b5cf6; font-weight: bold;">
          {{ activeTooltip.label }}
        </div>
        <div v-else style="display: flex; justify-content: space-between; gap: 12px;">
          <span>{{ activeTooltip.label }}:</span>
          <span class="amount-value">{{ formatYen(activeTooltip.value) }}</span>
        </div>
      </div>
    </div>

    <div class="legend" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 10px; font-size: 12px;">
      <div class="legend-item"><span class="box" style="background: #10b981;"></span>給与収入</div>
      <div class="legend-item"><span class="box" style="background: #f59e0b;"></span>年金収入</div>
      <div class="legend-item"><span class="box" style="background: #ef4444;"></span>資産取り崩し</div>
      <div class="legend-item"><span class="line" style="border-bottom: 2px dashed var(--text);"></span>支出</div>
      <div class="legend-item"><span class="line" style="border-bottom: 2px solid #3b82f6;"></span>金融資産 (決定論)</div>
      <template v-if="props.monteCarloPaths">
        <div class="legend-item"><span class="line" style="border-bottom: 2px solid #3b82f6; opacity: 0.8;"></span>P50 (中央値)</div>
        <div class="legend-item"><span class="line" style="border-bottom: 1.5px dashed #3b82f6; opacity: 0.6;"></span>P90 (上位10%)</div>
        <div class="legend-item"><span class="line" style="border-bottom: 1.5px dashed #ef4444; opacity: 0.6;"></span>P10 (下位10%)</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.box {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.line {
  width: 20px;
  height: 0;
}
.tooltip {
  position: absolute;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
</style>
