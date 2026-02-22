<script setup>
import { holdingRowKey } from "@/domain/format";
import { stockPriceUrl } from "@/domain/holdings";
import { useHoldingTableViewModel } from "@/features/holdings/useHoldingTableViewModel";

const props = defineProps({
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  title: { type: String, required: true },
  isLiability: { type: Boolean, default: false },
});

const {
  safeRows,
  displayedRows,
  isAmountColumn,
  isSortableColumn,
  toggleSort,
  sortMarker,
  formatCell,
  isStockNameColumn,
  isNameColumn,
  cellClass,
} = useHoldingTableViewModel(props);
</script>

<template>
  <section class="table-wrap">
    <div class="header-with-action">
      <h3 class="section-title">{{ title }}（{{ safeRows.length }}件）</h3>
      <slot name="action"></slot>
    </div>
    <table class="stack-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
            <button
              v-if="isSortableColumn(column)"
              type="button"
              class="sort-button"
              @click="toggleSort(column)"
            >
              {{ column.label }}{{ sortMarker(column) }}
            </button>
            <template v-else>{{ column.label }}</template>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in displayedRows" :key="`${holdingRowKey(row)}__${idx}`">
          <td
            v-for="column in columns"
            :key="column.key"
            :class="cellClass(column, row)"
            :data-label="column.label"
            :title="isNameColumn(column) ? row[column.key] : null"
          >
            <a
              v-if="isStockNameColumn(column, row)"
              class="stock-link"
              :href="stockPriceUrl(row[column.key], row['銘柄コード'])"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ formatCell(column, row) }}
            </a>
            <span v-else :class="isAmountColumn(column) ? 'amount-value' : ''">{{ formatCell(column, row) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-with-action .section-title {
  margin-bottom: 0;
}

.cell-name {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Override default white-space for name column to ensure ellipsis works */
table td.cell-name {
  white-space: nowrap;
}

@media (max-width: 700px) {
  .cell-name {
    max-width: none;
    white-space: normal !important;
  }
}
</style>
