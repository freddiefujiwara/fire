import { CASH_FLOW_CONFIG } from "./constants";

/**
 * カテゴリ文字列または明細オブジェクトから分類を返す (fixed | variable | exclude)
 * @param {string|object} categoryOrItem
 */
export const getExpenseType = (categoryOrItem) => {
  const isObj = categoryOrItem && typeof categoryOrItem === "object";
  const isTransfer = isObj ? categoryOrItem.isTransfer : false;
  const rawCategory = isObj ? categoryOrItem.category : categoryOrItem;
  const category = String(rawCategory ?? "");

  if (isTransfer) return "exclude";
  if (category.startsWith("特別な支出")) return "exclude";
  if (category.startsWith("現金")) return "exclude";
  if (category.startsWith("カード")) return "exclude";
  if (CASH_FLOW_CONFIG.EXCLUDE.some((k) => category.includes(k))) return "exclude";
  if (CASH_FLOW_CONFIG.FIXED.some((k) => category.includes(k))) return "fixed";
  return "variable"; // それ以外はすべて変動費
};
