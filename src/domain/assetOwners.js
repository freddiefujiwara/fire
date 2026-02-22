import { EMPTY_HOLDINGS } from "./holdings";
import { assetAmountYen, detectAssetOwner } from "./family";

export const OWNER_FILTERS = [
  { id: "all", label: "全体" },
  { id: "me", label: "私" },
  { id: "wife", label: "妻" },
  { id: "daughter", label: "娘" },
];

const CATEGORY_SUMMARY_DEFS = [
  { key: "cashLike", title: "現金・預金" },
  { key: "stocks", title: "株式" },
  { key: "funds", title: "投資信託" },
  { key: "pensions", title: "年金" },
  { key: "points", title: "ポイント" },
  { key: "liabilitiesDetail", title: "負債", isLiability: true },
];

function categoryRows(holdings, key) {
  const rows = holdings?.[key];
  return Array.isArray(rows) ? rows : [];
}

function rowOwnerId(row) {
  const explicitOwner = row?.Owner ?? row?.owner;
  if (explicitOwner) {
    return String(explicitOwner).toLowerCase();
  }

  return detectAssetOwner(row).id;
}

export function filterHoldingsByOwner(holdings, ownerId = "all") {
  const safe = holdings ?? EMPTY_HOLDINGS;

  if (ownerId === "all") {
    return safe;
  }

  return Object.fromEntries(
    Object.keys(EMPTY_HOLDINGS).map((key) => [
      key,
      categoryRows(safe, key).filter((row) => rowOwnerId(row) === ownerId),
    ]),
  );
}

export function summarizeByCategory(holdings) {
  const safe = holdings ?? EMPTY_HOLDINGS;

  return CATEGORY_SUMMARY_DEFS.map(({ key, title, isLiability }) => {
    const rows = categoryRows(safe, key);

    return {
      key,
      title,
      isLiability: Boolean(isLiability),
      amountYen: rows.reduce((sum, row) => sum + assetAmountYen(row), 0),
      count: rows.length,
    };
  });
}
