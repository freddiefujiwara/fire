<script setup>
import { useCashFlowBarChartViewModel } from "@/features/cashFlow/useCashFlowBarChartViewModel";

const props = defineProps({
  data: { type: Array, default: () => [] },
  showNet: { type: Boolean, default: true },
  averages: { type: Object, default: null },
});

const {
  chartContainerRef,
  activeTooltip,
  width,
  height,
  margin,
  innerWidth,
  innerHeight,
  range,
  yScale,
  yScaleRight,
  bars,
  netLinePath,
  deviationLinePath,
  fixedDeviationLinePath,
  variableDeviationLinePath,
  gridLines,
  rightGridLines,
  formatYen,
  showTooltip,
  hideTooltip,
  clearTooltip,
} = useCashFlowBarChartViewModel(props);
</script>

<template>
  <div class="chart-card">
    <h3 class="section-title">月次収支推移</h3>
    <div
      ref="chartContainerRef"
      class="chart-container cash-flow-chart-container"
      style="overflow-x: auto;"
      @click="clearTooltip"
    >
      <svg :viewBox="`0 0 ${width} ${height}`" class="bar-chart-svg" style="min-width: 600px; width: 100%; height: auto;">
        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <!-- Grid lines -->
          <g v-for="line in gridLines" :key="line.label" class="grid-line">
            <line x1="0" :y1="line.y" :x2="innerWidth" :y2="line.y" stroke="var(--border)" :stroke-dasharray="line.label === '0' ? '0' : '4'" />
            <text
              x="-10"
              :y="line.y"
              text-anchor="end"
              alignment-baseline="middle"
              font-size="10"
              fill="var(--muted)"
              class="amount-value cash-flow-y-axis-label"
            >
              {{ line.label }}
            </text>
          </g>

          <!-- Bars -->
          <g v-for="b in bars" :key="b.month">
            <rect
              :x="b.income.x"
              :y="b.income.y"
              :width="b.income.w"
              :height="b.income.h"
              fill="#22c55e"
              rx="2"
              opacity="0.8"
              @pointerenter="showTooltip($event, { month: b.month, label: '収入', value: b.income.val })"
              @pointermove="showTooltip($event, { month: b.month, label: '収入', value: b.income.val })"
              @pointerleave="hideTooltip($event)"
              @click.stop="showTooltip($event, { month: b.month, label: '収入', value: b.income.val })"
            >
              <title>{{ b.month }} 収入: {{ b.income.val.toLocaleString() }}</title>
            </rect>
            <rect
              :x="b.expense.x"
              :y="b.expense.fixed.y"
              :width="b.expense.w"
              :height="b.expense.fixed.h"
              fill="#38bdf8"
              opacity="0.8"
              @pointerenter="showTooltip($event, { month: b.month, label: '固定費', value: b.expense.fixed.val, deviation: b.deviation?.fixedVal })"
              @pointermove="showTooltip($event, { month: b.month, label: '固定費', value: b.expense.fixed.val, deviation: b.deviation?.fixedVal })"
              @pointerleave="hideTooltip($event)"
              @click.stop="showTooltip($event, { month: b.month, label: '固定費', value: b.expense.fixed.val, deviation: b.deviation?.fixedVal })"
            >
              <title>{{ b.month }} 固定費: {{ b.expense.fixed.val.toLocaleString() }}</title>
            </rect>
            <rect
              :x="b.expense.x"
              :y="b.expense.variable.y"
              :width="b.expense.w"
              :height="b.expense.variable.h"
              fill="#f59e0b"
              opacity="0.8"
              @pointerenter="showTooltip($event, { month: b.month, label: '変動費', value: b.expense.variable.val, deviation: b.deviation?.variableVal })"
              @pointermove="showTooltip($event, { month: b.month, label: '変動費', value: b.expense.variable.val, deviation: b.deviation?.variableVal })"
              @pointerleave="hideTooltip($event)"
              @click.stop="showTooltip($event, { month: b.month, label: '変動費', value: b.expense.variable.val, deviation: b.deviation?.variableVal })"
            >
              <title>{{ b.month }} 変動費: {{ b.expense.variable.val.toLocaleString() }}</title>
            </rect>
            <rect
              :x="b.expense.x"
              :y="b.expense.exclude.y"
              :width="b.expense.w"
              :height="b.expense.exclude.h"
              fill="#4b5563"
              rx="2"
              opacity="0.8"
              @pointerenter="showTooltip($event, { month: b.month, label: '除外', value: b.expense.exclude.val })"
              @pointermove="showTooltip($event, { month: b.month, label: '除外', value: b.expense.exclude.val })"
              @pointerleave="hideTooltip($event)"
              @click.stop="showTooltip($event, { month: b.month, label: '除外', value: b.expense.exclude.val })"
            >
              <title>{{ b.month }} 除外: {{ b.expense.exclude.val.toLocaleString() }}</title>
            </rect>
            <text
              :x="b.income.x + b.income.w"
              :y="innerHeight + 25"
              text-anchor="middle"
              font-size="12"
              fill="var(--muted)"
            >
              {{ b.month.split('-')[1] }}月
            </text>
          </g>

          <!-- Net Line -->
          <template v-if="showNet">
            <path :d="netLinePath" fill="none" stroke="#3b82f6" stroke-width="2" />
            <circle
              v-for="b in bars"
              :key="'net-'+b.month"
              :cx="b.income.x + b.income.w"
              :cy="b.net.y"
              r="4"
              fill="#3b82f6"
              @pointerenter="showTooltip($event, { month: b.month, label: '純収支', value: b.net.val })"
              @pointermove="showTooltip($event, { month: b.month, label: '純収支', value: b.net.val })"
              @pointerleave="hideTooltip($event)"
              @click.stop="showTooltip($event, { month: b.month, label: '純収支', value: b.net.val })"
            >
               <title>{{ b.month }} 純収支: {{ b.net.val.toLocaleString() }}</title>
            </circle>
          </template>

          <!-- Zero line -->
          <line x1="0" :y1="yScale(0)" :x2="innerWidth" :y2="yScale(0)" stroke="var(--text)" stroke-width="1" />

          <!-- High deviation indicators -->
          <g v-for="b in bars" :key="'high-'+b.month">
            <text
              v-if="b.deviation && b.deviation.val > 10"
              :x="b.expense.x + b.expense.w / 2"
              :y="yScale(0) - 5"
              text-anchor="middle"
              fill="#ef4444"
              font-size="12"
              font-weight="bold"
              title="生活費が平均より10%以上高い"
            >
              ▲
            </text>
          </g>

          <!-- Average Lifestyle Line -->
          <line
            v-if="averages && (averages.fixed + averages.variable) > 0"
            x1="0"
            :y1="yScale(-(averages.fixed + averages.variable))"
            :x2="innerWidth"
            :y2="yScale(-(averages.fixed + averages.variable))"
            stroke="var(--muted)"
            stroke-width="1"
            stroke-dasharray="4 4"
            opacity="0.8"
          />

          <!-- Right Axis -->
          <g v-if="rightGridLines.length > 0" class="right-axis">
            <g v-for="line in rightGridLines" :key="'right-'+line.label">
              <line
                v-if="line.isZero"
                x1="0" :y1="line.y" :x2="innerWidth" :y2="line.y"
                stroke="#ec4899" stroke-width="1" stroke-dasharray="2 2" opacity="0.5"
              />
              <text
                :x="innerWidth + 10"
                :y="line.y"
                text-anchor="start"
                alignment-baseline="middle"
                font-size="10"
                fill="#ec4899"
                opacity="0.8"
              >
                {{ line.label }}
              </text>
            </g>
            <text
              :x="innerWidth + 10"
              :y="-15"
              text-anchor="start"
              font-size="10"
              font-weight="bold"
              fill="#ec4899"
            >
              生活費乖離率
            </text>
          </g>

          <!-- Deviation Lines (Individual) -->
          <template v-if="fixedDeviationLinePath">
            <path :d="fixedDeviationLinePath" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.5" />
            <circle
              v-for="b in bars.filter(b => b.deviation && b.deviation.fixedVal !== null)"
              :key="'fdev-'+b.month"
              :cx="b.deviation.x"
              :cy="yScaleRight(b.deviation.fixedVal)"
              r="3"
              fill="#38bdf8"
              opacity="0.5"
              @pointerenter="showTooltip($event, { month: b.month, label: '固定費', value: b.expense.fixed.val, deviation: b.deviation.fixedVal })"
              @pointermove="showTooltip($event, { month: b.month, label: '固定費', value: b.expense.fixed.val, deviation: b.deviation.fixedVal })"
              @pointerleave="hideTooltip($event)"
              @click.stop="showTooltip($event, { month: b.month, label: '固定費', value: b.expense.fixed.val, deviation: b.deviation.fixedVal })"
            />
          </template>

          <template v-if="variableDeviationLinePath">
            <path :d="variableDeviationLinePath" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.5" />
            <circle
              v-for="b in bars.filter(b => b.deviation && b.deviation.variableVal !== null)"
              :key="'vdev-'+b.month"
              :cx="b.deviation.x"
              :cy="yScaleRight(b.deviation.variableVal)"
              r="3"
              fill="#f59e0b"
              opacity="0.5"
              @pointerenter="showTooltip($event, { month: b.month, label: '変動費', value: b.expense.variable.val, deviation: b.deviation.variableVal })"
              @pointermove="showTooltip($event, { month: b.month, label: '変動費', value: b.expense.variable.val, deviation: b.deviation.variableVal })"
              @pointerleave="hideTooltip($event)"
              @click.stop="showTooltip($event, { month: b.month, label: '変動費', value: b.expense.variable.val, deviation: b.deviation.variableVal })"
            />
          </template>

          <!-- Deviation Line (Total) -->
          <template v-if="deviationLinePath">
            <path :d="deviationLinePath" fill="none" stroke="#ec4899" stroke-width="2" stroke-dasharray="4 2" opacity="0.8" />
            <circle
              v-for="b in bars.filter(b => b.deviation && b.deviation.val !== null)"
              :key="'dev-'+b.month"
              :cx="b.deviation.x"
              :cy="yScaleRight(b.deviation.val)"
              r="4"
              fill="#ec4899"
              opacity="0.9"
              @pointerenter="showTooltip($event, { month: b.month, label: '生活費(固定+変動)', value: b.expense.fixed.val + b.expense.variable.val, deviation: b.deviation.val })"
              @pointermove="showTooltip($event, { month: b.month, label: '生活費(固定+変動)', value: b.expense.fixed.val + b.expense.variable.val, deviation: b.deviation.val })"
              @pointerleave="hideTooltip($event)"
              @click.stop="showTooltip($event, { month: b.month, label: '生活費(固定+変動)', value: b.expense.fixed.val + b.expense.variable.val, deviation: b.deviation.val })"
            />
          </template>
        </g>
      </svg>
      <div
        v-if="activeTooltip"
        class="cash-flow-tooltip"
        :style="{ left: `${activeTooltip.x}px`, top: `${activeTooltip.y}px` }"
        role="tooltip"
      >
        <div style="font-weight: bold; margin-bottom: 2px;">{{ activeTooltip.month }} {{ activeTooltip.label }}</div>
        <div>金額: <span class="amount-value">{{ formatYen(activeTooltip.value) }}</span></div>
        <div v-if="activeTooltip.deviation !== undefined && activeTooltip.deviation !== null" style="font-size: 11px; margin-top: 2px;">
          平均比:
          <span :class="activeTooltip.deviation > 0 ? 'is-negative' : 'is-positive'" style="font-weight: bold;">
            {{ activeTooltip.deviation > 0 ? '+' : '' }}{{ activeTooltip.deviation.toFixed(1) }}%
          </span>
        </div>
      </div>
    </div>
    <div class="legend" style="display: flex; flex-direction: row; justify-content: center; gap: 20px; margin-top: 10px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 12px; height: 12px; background: #22c55e; border-radius: 2px;"></span>
        <span style="font-size: 12px;">収入</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 12px; height: 12px; background: #38bdf8; border-radius: 2px;"></span>
        <span style="font-size: 12px;">支出（固定）</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 12px; height: 12px; background: #f59e0b; border-radius: 2px;"></span>
        <span style="font-size: 12px;">支出（変動）</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 12px; height: 12px; background: #4b5563; border-radius: 2px;"></span>
        <span style="font-size: 12px;">支出（除外）</span>
      </div>
      <div v-if="showNet" style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 12px; height: 2px; background: #3b82f6;"></span>
        <span style="font-size: 12px;">純収支</span>
      </div>
      <div v-if="averages" style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 12px; height: 2px; border-top: 2px dashed #ec4899;"></span>
        <span style="font-size: 12px; color: #ec4899;">生活費(計)乖離</span>
      </div>
      <div v-if="averages && averages.fixed > 0" style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 12px; height: 1px; border-top: 1px dashed #38bdf8;"></span>
        <span style="font-size: 12px; color: #38bdf8;">固定費乖離</span>
      </div>
      <div v-if="averages && averages.variable > 0" style="display: flex; align-items: center; gap: 4px;">
        <span style="width: 12px; height: 1px; border-top: 1px dashed #f59e0b;"></span>
        <span style="font-size: 12px; color: #f59e0b;">変動費乖離</span>
      </div>
    </div>
    <p
      v-if="averages && averages.count > 0"
      class="meta"
      style="margin-top: 8px; text-align: center;"
    >
      直近{{ averages.count }}か月平均：
      収入 <span class="amount-value">{{ Math.round(averages.income).toLocaleString() }}</span> /
      支出 <span class="amount-value">{{ Math.round(averages.expense).toLocaleString() }}</span>
      <template v-if="showNet">
        / 純収支 <span class="amount-value">{{ Math.round(averages.net).toLocaleString() }}</span>
      </template>
      <br />
      固定費 <span class="amount-value">{{ Math.round(averages.fixed).toLocaleString() }}</span> /
      変動費 <span class="amount-value">{{ Math.round(averages.variable).toLocaleString() }}</span> /
      生活費（計） <span class="amount-value">{{ Math.round(averages.fixed + averages.variable).toLocaleString() }}</span>
    </p>
  </div>
</template>

<style scoped>
.bar-chart-svg {
  font-family: inherit;
}

.cash-flow-chart-container {
  position: relative;
}

.cash-flow-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
  background: color-mix(in srgb, var(--surface-elevated) 90%, black 10%);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12px;
  z-index: 2;
  white-space: nowrap;
}

.is-positive {
  color: var(--success, #22c55e);
}
.is-negative {
  color: var(--danger, #ef4444);
}
</style>
