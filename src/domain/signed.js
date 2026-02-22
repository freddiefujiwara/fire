/**
 * signed層: 符号表現・損益率演算の責務のみを持つ。
 * - パースはparse層
 * - 表示通貨整形はformat層
 */

/**
 * @param {number} value
 * @returns {string}
 */
export function signedClass(value) {
  return value > 0 ? "is-positive" : value < 0 ? "is-negative" : "";
}

/**
 * @param {number|null|undefined} value
 * @param {number} [digits=2]
 * @returns {string}
 */
export function formatSignedPercent(value, digits = 2) {
  if (value == null) {
    return "-";
  }

  const sign = value > 0 ? "+" : value < 0 ? "-" : "±";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/**
 * 投下元本 = 総評価額 - 損益 から算出する損益率(%)
 * @param {number} totalAmountYen
 * @param {number} totalProfitYen
 * @returns {number|null}
 */
export function totalProfitRate(totalAmountYen, totalProfitYen) {
  const principal = totalAmountYen - totalProfitYen;

  if (principal === 0) {
    return totalAmountYen === 0 && totalProfitYen === 0 ? 0 : null;
  }

  return (totalProfitYen / principal) * 100;
}
