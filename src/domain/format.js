import { toNumber } from "./parse";

/**
 * format層: ドメイン数値を表示文字列へ変換する責務のみを持つ。
 * - パース責務はparse層へ委譲
 * - 演算責務はsigned層/各domain層へ委譲
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatYen(value) {
  return `¥${Math.round(toNumber(value)).toLocaleString("ja-JP")}`;
}
