import { toNumber } from "./parse";

/**
 * format層: ドメイン数値を表示文字列へ変換する責務のみを持つ。
 * - パース責務はparse層へ委譲
 * - 演算責務はsigned層/各domain層へ委譲
 */

const DAILY_CHANGE_KEYS = [
  "前日比",
  "前日からの値動き",
  "前日損益",
  "前日比損益",
  "評価損益",
  "当日損益",
];

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatYen(value) {
  return `¥${Math.round(toNumber(value)).toLocaleString("ja-JP")}`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatSignedYen(value) {
  const amount = toNumber(value);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "±";
  return `${sign}¥${Math.abs(amount).toLocaleString("ja-JP")}`;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {number|null}
 */
export function dailyChangeYen(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  for (const key of DAILY_CHANGE_KEYS) {
    if (key in row) {
      return toNumber(row[key]);
    }
  }

  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {string}
 */
export function holdingRowKey(row) {
  const institution = row?.["保有金融機関"] ?? "";
  const name =
    row?.["名称・説明"] ?? row?.["種類・名称"] ?? row?.["銘柄名"] ?? row?.["名称"] ?? "";
  return `${institution}__${name}`;
}

/**
 * @param {unknown} text
 * @param {number} [length=25]
 * @returns {unknown}
 */
export function truncate(text, length = 25) {
  if (typeof text !== "string") return text;
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}
