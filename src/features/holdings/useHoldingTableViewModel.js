import { computed, ref } from "vue";
import { dailyChangeYen, formatSignedYen, formatYen } from "@/domain/format";
import { toNumber } from "@/domain/parse";

const amountLikePattern = /金額|残高|評価額|価値|損益/i;
const nonAmountPattern = /コード|率|割合|比/i;
const percentPattern = /率|割合|比/i;
const SORTABLE_COLUMN_KEYS = new Set(["評価額", "評価損益", "評価損益率", "__dailyChange", "__riskAssetRatio", "__totalAssetRatio"]);

/**
 * Manage sort and cell view logic for HoldingTable.
 */
export function useHoldingTableViewModel(props) {
  const sortKey = ref("");
  const sortDirection = ref("asc");

  const safeRows = computed(() => (Array.isArray(props.rows) ? props.rows : []));

  /**
   * Check if a column is money-like.
   */
  const isAmountColumn = (column) => {
    if (column.key === "__dailyChange") return false;
    const keyLabel = `${column.key}${column.label}`;
    return amountLikePattern.test(keyLabel) && !nonAmountPattern.test(keyLabel);
  };

  /**
   * Check if a column can be sorted.
   */
  const isSortableColumn = (column) => SORTABLE_COLUMN_KEYS.has(column.key);

  /**
   * Change sort state for one column.
   */
  const toggleSort = (column) => {
    if (!isSortableColumn(column)) return;
    if (sortKey.value !== column.key) {
      sortKey.value = column.key;
      sortDirection.value = "asc";
      return;
    }
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  };

  /**
   * Return visual marker for current sort state.
   */
  const sortMarker = (column) => {
    if (sortKey.value !== column.key) return "";
    return sortDirection.value === "asc" ? " ↑" : " ↓";
  };

  /**
   * Read sort value from one row and key.
   */
  const sortValue = (row, key) => {
    if (key === "__dailyChange") {
      const daily = dailyChangeYen(row);
      return daily == null ? null : daily;
    }
    return toNumber(row?.[key]);
  };

  const displayedRows = computed(() => {
    if (!sortKey.value) return safeRows.value;
    const direction = sortDirection.value === "asc" ? 1 : -1;
    return safeRows.value
      .map((row, idx) => ({ row, idx }))
      .sort((a, b) => {
        const aValue = sortValue(a.row, sortKey.value);
        const bValue = sortValue(b.row, sortKey.value);
        if (aValue == null && bValue == null) return a.idx - b.idx;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (aValue === bValue) return a.idx - b.idx;
        return aValue > bValue ? direction : -direction;
      })
      .map((entry) => entry.row);
  });

  /**
   * Convert raw row value to view text.
   */
  const formatCell = (column, row) => {
    if (column.key === "__dailyChange") {
      const daily = dailyChangeYen(row);
      return daily == null ? "-" : formatSignedYen(daily);
    }

    const rawValue = row[column.key];
    if (rawValue == null) return "-";

    if (!isAmountColumn(column)) {
      if (percentPattern.test(`${column.key}${column.label}`)) {
        const value = String(rawValue);
        return value.includes("%") ? value : `${value}%`;
      }
      return rawValue;
    }

    const formatted = formatYen(rawValue);
    return props.isLiability ? `-${formatted}` : formatted;
  };

  /**
   * Check if this cell should be a stock link.
   */
  const isStockNameColumn = (column, row) => column.key === "銘柄名" && row?.["銘柄コード"];
  /**
   * Check if this column is a name column.
   */
  const isNameColumn = (column) => /銘柄名|名称/.test(column.label);

  /**
   * Build css classes for one table cell.
   */
  const cellClass = (column, row) => {
    const classes = [];
    if (isNameColumn(column)) classes.push("cell-name");
    if (column.key === "評価損益" || column.key === "評価損益率") {
      const value = toNumber(row?.[column.key]);
      if (value != null && value !== 0) classes.push(value > 0 ? "is-positive" : "is-negative");
    } else if (column.key === "__dailyChange") {
      const value = dailyChangeYen(row);
      if (value != null && value !== 0) classes.push(value > 0 ? "is-positive" : "is-negative");
    } else if (isAmountColumn(column)) {
      classes.push(props.isLiability ? "is-negative" : "is-positive");
    }
    return classes.join(" ");
  };

  return {
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
  };
}
