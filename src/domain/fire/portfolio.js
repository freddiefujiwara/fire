import { assetAmountYen, detectAssetOwner } from "../family";

/**
 * Sum only risk asset classes from summary data.
 */
export function calculateRiskAssets(portfolio) {
  const riskCategories = [
    "株式（現物）",
    "株式（信用）",
    "投資信託",
    "年金",
    "先物・オプション",
    "外貨預金",
    "債券",
  ];
  if (!portfolio?.summary?.assetsByClass) return 0;
  return portfolio.summary.assetsByClass
    .filter((item) => riskCategories.includes(item.name))
    .reduce((sum, item) => sum + item.amountYen, 0);
}

/**
 * Sum assets for one excluded owner id.
 */
export function calculateExcludedOwnerAssets(portfolio, excludedOwnerId = "daughter") {
  if (!portfolio?.holdings) {
    return { totalAssetsYen: 0, riskAssetsYen: 0 };
  }

  const allAssetKeys = ["cashLike", "stocks", "funds", "pensions", "points"];
  const riskAssetKeys = ["stocks", "funds", "pensions"];

  /**
   * Sum amount by selected holdings keys.
   */
  const sumByKeys = (keys) =>
    keys.reduce((sum, key) => {
      const rows = Array.isArray(portfolio.holdings?.[key]) ? portfolio.holdings[key] : [];
      const sectionTotal = rows.reduce((sectionSum, row) => {
        const owner = detectAssetOwner(row);
        if (owner.id !== excludedOwnerId) {
          return sectionSum;
        }
        return sectionSum + assetAmountYen(row);
      }, 0);

      return sum + sectionTotal;
    }, 0);

  return {
    totalAssetsYen: sumByKeys(allAssetKeys),
    riskAssetsYen: sumByKeys(riskAssetKeys),
  };
}

/**
 * Build daughter asset/liability breakdown by type.
 */
export function calculateDaughterAssetsBreakdown(portfolio) {
  const breakdown = {
    cash: 0,
    stocks: 0,
    funds: 0,
    pensions: 0,
    points: 0,
    liabilities: 0,
  };

  if (!portfolio?.holdings) return breakdown;

  const map = {
    cashLike: "cash",
    stocks: "stocks",
    funds: "funds",
    pensions: "pensions",
    points: "points",
  };

  Object.entries(map).forEach(([key, bKey]) => {
    const rows = portfolio.holdings[key] || [];
    rows.forEach((row) => {
      if (detectAssetOwner(row).id === "daughter") {
        breakdown[bKey] += assetAmountYen(row);
      }
    });
  });

  const liabRows = portfolio.holdings.liabilitiesDetail || [];
  liabRows.forEach((row) => {
    if (detectAssetOwner(row).id === "daughter") {
      breakdown.liabilities += assetAmountYen(row);
    }
  });

  return breakdown;
}

/**
 * Build FIRE portfolio values for selected owners.
 */
export function calculateFirePortfolio(portfolio, includedOwnerIds = ["me", "wife"]) {
  if (!portfolio?.holdings) {
    return { totalAssetsYen: 0, riskAssetsYen: 0, cashAssetsYen: 0, liabilitiesYen: 0, netWorthYen: 0 };
  }

  const riskCategories = [
    "株式（現物）",
    "株式（信用）",
    "投資信託",
    "年金",
    "先物・オプション",
    "外貨預金",
    "債券",
  ];

  const allAssetKeys = ["cashLike", "stocks", "funds", "pensions", "points"];
  const riskAssetKeys = new Set(["stocks", "funds", "pensions"]);

  let totalAssetsYen = 0;
  let riskAssetsYen = 0;

  allAssetKeys.forEach((key) => {
    const rows = Array.isArray(portfolio.holdings?.[key]) ? portfolio.holdings[key] : [];
    rows.forEach((row) => {
      const owner = detectAssetOwner(row);
      if (!includedOwnerIds.includes(owner.id)) return;

      const amount = assetAmountYen(row);
      totalAssetsYen += amount;

      const category = row.category || "";
      if (riskAssetKeys.has(key) || riskCategories.includes(category)) {
        riskAssetsYen += amount;
      }
    });
  });

  const liabilitiesRows = Array.isArray(portfolio.holdings?.liabilitiesDetail)
    ? portfolio.holdings.liabilitiesDetail
    : [];
  const liabilitiesYen = liabilitiesRows.reduce((sum, row) => {
    const owner = detectAssetOwner(row);
    if (!includedOwnerIds.includes(owner.id)) return sum;
    return sum + assetAmountYen(row);
  }, 0);

  const cashAssetsYen = Math.max(0, totalAssetsYen - riskAssetsYen);
  const netWorthYen = totalAssetsYen - liabilitiesYen;

  return { totalAssetsYen, riskAssetsYen, cashAssetsYen, liabilitiesYen, netWorthYen };
}

/**
 * Calculate cash assets as total minus risk assets.
 */
export function calculateCashAssets(portfolio) {
  const riskAssets = calculateRiskAssets(portfolio);
  const totalAssets = portfolio?.totals?.assetsYen || 0;
  return totalAssets - riskAssets;
}
