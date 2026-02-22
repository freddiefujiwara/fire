import { dailyChangeYen } from "../format";
import { toNumber } from "../parse";
import { totalProfitRate } from "../signed";

export const EMPTY_HOLDINGS = {
  cashLike: [],
  stocks: [],
  funds: [],
  pensions: [],
  points: [],
  liabilitiesDetail: [],
};

export const HOLDING_TABLE_CONFIGS = [
  {
    title: "現金・預金",
    key: "cashLike",
    columns: [
      { key: "種類・名称", label: "名称" },
      { key: "残高", label: "残高" },
      { key: "保有金融機関", label: "金融機関" },
    ],
  },
  {
    title: "株式",
    key: "stocks",
    columns: [
      { key: "銘柄コード", label: "コード" },
      { key: "銘柄名", label: "銘柄名" },
      { key: "評価額", label: "評価額" },
      { key: "評価損益", label: "評価損益" },
      { key: "評価損益率", label: "評価損益率" },
      { key: "__dailyChange", label: "前日比" },
      { key: "__riskAssetRatio", label: "リスク比" },
      { key: "__totalAssetRatio", label: "全体比" },
      { key: "保有金融機関", label: "金融機関" },
    ],
  },
  {
    title: "投資信託",
    key: "funds",
    columns: [
      { key: "銘柄名", label: "銘柄名" },
      { key: "評価額", label: "評価額" },
      { key: "評価損益", label: "評価損益" },
      { key: "評価損益率", label: "評価損益率" },
      { key: "__dailyChange", label: "前日比" },
      { key: "__riskAssetRatio", label: "リスク比" },
      { key: "__totalAssetRatio", label: "全体比" },
      { key: "保有金融機関", label: "金融機関" },
    ],
  },
  {
    title: "年金",
    key: "pensions",
    columns: [
      { key: "名称", label: "名称" },
      { key: "現在価値", label: "現在価値" },
      { key: "評価損益", label: "評価損益" },
      { key: "評価損益率", label: "評価損益率" },
      { key: "__riskAssetRatio", label: "リスク比" },
      { key: "__totalAssetRatio", label: "全体比" },
    ],
  },
  {
    title: "ポイント",
    key: "points",
    columns: [
      { key: "名称", label: "名称" },
      { key: "現在の価値", label: "現在の価値" },
      { key: "保有金融機関", label: "金融機関" },
    ],
  },
  {
    title: "負債詳細",
    key: "liabilitiesDetail",
    isLiability: true,
    columns: [
      { key: "種類", label: "種類" },
      { key: "名称・説明", label: "名称" },
      { key: "残高", label: "残高" },
      { key: "保有金融機関", label: "金融機関" },
    ],
  },
];

function holdingRows(holdings, key) {
  const rows = holdings?.[key];
  return Array.isArray(rows) ? rows : [];
}

export function stockFundRows(holdings) {
  const safe = holdings ?? EMPTY_HOLDINGS;
  return [...holdingRows(safe, "stocks"), ...holdingRows(safe, "funds")];
}

export function riskAssetSummary(holdings) {
  const sfRows = stockFundRows(holdings);
  const safe = holdings ?? EMPTY_HOLDINGS;
  const pRows = Array.isArray(safe.pensions) ? safe.pensions : [];
  const allRows = [...sfRows, ...pRows];

  const totalYen = allRows.reduce(
    (sum, row) => sum + (toNumber(row?.["評価額"]) || toNumber(row?.["現在価値"])),
    0,
  );
  const dailyMoves = sfRows.map((row) => dailyChangeYen(row)).filter((value) => value != null);
  const dailyMoveTotal = dailyMoves.reduce((sum, value) => sum + value, 0);
  const totalProfitYen = allRows.reduce((sum, row) => {
    if (!row || !("評価損益" in row)) {
      return sum;
    }
    return sum + toNumber(row["評価損益"]);
  }, 0);
  const totalProfitRatePct = totalProfitRate(totalYen, totalProfitYen);

  return {
    rows: allRows,
    totalYen,
    dailyMoves,
    dailyMoveTotal,
    totalProfitYen,
    totalProfitRatePct,
  };
}

/**
 * Aggregates rows by name and builds treemap tiles.
 */
function buildTiles(rows, { aggregate = false } = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];

  let processedRows = safeRows;
  if (aggregate) {
    const map = new Map();
    safeRows.forEach(row => {
      const name = row?.["銘柄名"] || row?.["名称"] || "名称未設定";
      const value = toNumber(row?.["評価額"]) || toNumber(row?.["現在価値"]) || 0;
      const profit = toNumber(row?.["評価損益"]) || 0;
      const dailyChange = dailyChangeYen(row) || 0;
      const institution = row?.["保有金融機関"] || "不明";

      if (!map.has(name)) {
        map.set(name, {
          name,
          value: 0,
          profit: 0,
          dailyChange: 0,
          details: []
        });
      }
      const entry = map.get(name);
      entry.value += value;
      entry.profit += profit;
      entry.dailyChange += dailyChange;
      entry.details.push({ institution, value });
    });
    processedRows = Array.from(map.values());
  } else {
    processedRows = safeRows.map((row, idx) => {
      const value = toNumber(row?.["評価額"]) || toNumber(row?.["現在価値"]) || 0;
      return {
        name: row?.["銘柄名"] ?? row?.["銘柄コード"] ?? row?.["名称"] ?? "名称未設定",
        value,
        profit: toNumber(row?.["評価損益"]),
        dailyChange: dailyChangeYen(row),
        idx
      };
    });
  }

  const prepared = processedRows
    .filter((entry) => entry.value > 0)
    .sort((a, b) => {
      if (a.value === b.value) {
        return (a.idx ?? 0) - (b.idx ?? 0);
      }
      return b.value - a.value;
    });

  if (!prepared.length) {
    return [];
  }

  const layouted = [];
  layoutTreemap(prepared, 0, 0, 100, 100, layouted);

  return layouted.map((entry) => ({
    ...entry,
    isNegative: entry.dailyChange != null && entry.dailyChange < 0,
  }));
}

export function stockTiles(stocks) {
  return buildTiles(stocks, { aggregate: false });
}

export function fundTiles(funds) {
  return buildTiles(funds, { aggregate: true });
}

export function pensionTiles(pensions) {
  return buildTiles(pensions, { aggregate: true });
}

export function allRiskTiles(holdings) {
  const stocks = holdings?.stocks || [];
  const funds = holdings?.funds || [];
  const pensions = holdings?.pensions || [];
  const combined = [...stocks, ...funds, ...pensions];
  return buildTiles(combined, { aggregate: true });
}

/**
 * Returns Yahoo Finance symbol if applicable.
 */
export function getYahooSymbol(code) {
  const sCode = String(code ?? "");
  if (/^[0-9]{4}$/.test(sCode)) {
    return `${sCode}.T`;
  }
  if (/^[0-9]{5}$/.test(sCode)) {
    return `${sCode.substring(0, 4)}.T`;
  }
  if (/^[A-Z]+$/.test(sCode)) {
    return sCode;
  }
  return null;
}

/**
 * Returns external URL for stock price.
 */
export function stockPriceUrl(name, code) {
  const symbol = getYahooSymbol(code);
  if (symbol) {
    if (/^[A-Z]+$/.test(symbol)) {
      return `https://finance.yahoo.com/quote/${symbol}/`;
    }
    return `https://finance.yahoo.co.jp/quote/${symbol}?term=1d`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(String(name ?? ""))}`;
}

/**
 * Generates CSV string for stocks (symbol,quantity).
 */
export function generateStockCsv(stocks) {
  const rows = Array.isArray(stocks) ? stocks : [];
  return rows
    .map((row) => {
      const code = row?.["銘柄コード"];
      const symbol = getYahooSymbol(code) || String(code ?? "");
      const quantity = toNumber(row?.["保有数"] || row?.["数量"]);
      return `${symbol},${quantity}`;
    })
    .join("\n");
}

function layoutTreemap(items, x, y, width, height, output) {
  if (items.length === 1) {
    output.push({ ...items[0], x, y, width, height });
    return;
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const target = total / 2;

  let splitIndex = 1;
  let leftSum = items[0].value;
  while (splitIndex < items.length - 1 && leftSum < target) {
    leftSum += items[splitIndex].value;
    splitIndex += 1;
  }

  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);
  const leftRatio = leftSum / total;

  if (width >= height) {
    const leftWidth = width * leftRatio;
    layoutTreemap(leftItems, x, y, leftWidth, height, output);
    layoutTreemap(rightItems, x + leftWidth, y, width - leftWidth, height, output);
    return;
  }

  const topHeight = height * leftRatio;
  layoutTreemap(leftItems, x, y, width, topHeight, output);
  layoutTreemap(rightItems, x, y + topHeight, width, height - topHeight, output);
}
