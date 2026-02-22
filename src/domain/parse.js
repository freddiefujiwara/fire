/**
 * parse層: 外部入力(文字列/数値)をドメイン数値へ正規化する責務のみを持つ。
 * - 表示整形は行わない
 * - ドメイン演算は行わない
 */

/**
 * 会計表記の負数マーカーを判定する。
 * 例: (1,200), ▲1,200, △1,200
 * @param {unknown} raw
 * @returns {boolean}
 */
function hasAccountingNegativeMarker(raw) {
  const normalized = String(raw ?? "").trim();
  return (normalized.startsWith("(") && normalized.endsWith(")")) || /^[▲△]/.test(normalized);
}

/**
 * 文字列または数値を数値へ変換する。
 * @param {unknown} value
 * @returns {number}
 */
export function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const isNegative = hasAccountingNegativeMarker(value);

  const normalized = value
    .replace(/[￥¥,\s]/g, "")
    .replace(/円/g, "")
    .replace(/[()▲△]/g, "")
    .replace(/[^0-9.+-]/g, "");

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * パーセント表記を数値(%)へ変換する。
 * @param {unknown} value
 * @returns {number}
 */
export function toPercent(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const isNegative = hasAccountingNegativeMarker(value);
  const normalized = value.replace(/[%()▲△]/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return isNegative ? -Math.abs(parsed) : parsed;
}
