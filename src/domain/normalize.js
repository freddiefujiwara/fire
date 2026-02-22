import { toNumber, toPercent } from "./parse";

/**
 * normalize層: APIレスポンス契約をアプリ内部ドメイン形に変換する責務のみを持つ。
 * - 文字列/数値の型正規化はparse層に委譲
 * - 表示整形は行わない
 */

/**
 * @param {unknown} value
 * @returns {Array<unknown>}
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * 年金行で評価損益が欠落しているケースを補完する。
 * @param {any} row
 * @returns {any}
 */
function withDerivedPensionProfit(row) {
  if (!row || typeof row !== "object") {
    return row;
  }

  if (row["評価損益"] != null) {
    return row;
  }

  const currentValue = toNumber(row["現在価値"]);
  const ratePercent = toPercent(row["評価損益率"]);
  const denominator = 100 + ratePercent;

  if (!Number.isFinite(currentValue) || !Number.isFinite(ratePercent) || denominator === 0) {
    return row;
  }

  const profitYen = Math.round((currentValue * ratePercent) / denominator);
  return {
    ...row,
    評価損益: String(profitYen),
  };
}

/**
 * @param {any} api
 */
export function normalizePortfolio(api) {
  const safeApi = api ?? {};

  const assetsByClass = asArray(safeApi.breakdown).map((item) => ({
    name: String(item?.category ?? ""),
    amountYen: toNumber(item?.amount_yen),
    percentage: toPercent(item?.percentage),
  }));

  const liabilitiesByCategory = asArray(safeApi["breakdown-liability"]).map((item) => ({
    category: String(item?.category ?? ""),
    amountYen: toNumber(item?.amount_yen),
    percentage: toPercent(item?.percentage),
  }));

  const assetsYen = assetsByClass.reduce((sum, item) => sum + item.amountYen, 0);
  const liabilitiesYen = toNumber(safeApi["total-liability"]?.[0]?.total_yen);

  return {
    totals: {
      assetsYen,
      liabilitiesYen,
      netWorthYen: assetsYen - liabilitiesYen,
    },
    summary: {
      assetsByClass,
      liabilitiesByCategory,
    },
    holdings: {
      cashLike: asArray(safeApi.details__portfolio_det_depo__t0),
      stocks: asArray(safeApi.details__portfolio_det_eq__t0),
      funds: asArray(safeApi.details__portfolio_det_mf__t0),
      pensions: asArray(safeApi.details__portfolio_det_pns__t0).map((row) => withDerivedPensionProfit(row)),
      points: asArray(safeApi.details__portfolio_det_po__t0),
      liabilitiesDetail: asArray(safeApi["details__liability_det__t0-liability"]),
    },
    cashFlow: asArray(safeApi.mfcf).map((item) => ({
      date: String(item?.date ?? ""),
      amount: toNumber(item?.amount),
      currency: String(item?.currency ?? "JPY"),
      name: String(item?.name ?? ""),
      category: String(item?.category ?? ""),
      isTransfer: Boolean(item?.is_transfer),
    })),
  };
}
