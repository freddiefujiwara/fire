import { describe, expect, it } from "vitest";
import * as holdingsDomain from "./holdings";
import {
  EMPTY_HOLDINGS,
  HOLDING_TABLE_CONFIGS,
  riskAssetSummary,
  stockTiles,
  fundTiles,
  pensionTiles,
  stockFundRows,
  allRiskTiles,
  getYahooSymbol,
  stockPriceUrl,
  generateStockCsv,
} from "./holdings";

describe("holdings domain", () => {
  it("keeps expected exported functions on the holdings barrel", () => {
    expect(holdingsDomain).toMatchObject({
      EMPTY_HOLDINGS: expect.any(Object),
      HOLDING_TABLE_CONFIGS: expect.any(Array),
      stockFundRows: expect.any(Function),
      riskAssetSummary: expect.any(Function),
      stockTiles: expect.any(Function),
      fundTiles: expect.any(Function),
      pensionTiles: expect.any(Function),
      allRiskTiles: expect.any(Function),
    });
  });

  it("provides stable default shape", () => {
    expect(Object.keys(EMPTY_HOLDINGS)).toEqual([
      "cashLike",
      "stocks",
      "funds",
      "pensions",
      "points",
      "liabilitiesDetail",
    ]);
    expect(HOLDING_TABLE_CONFIGS).toHaveLength(6);

    const stocks = HOLDING_TABLE_CONFIGS.find((c) => c.key === "stocks");
    expect(stocks.columns.some((c) => c.key === "__riskAssetRatio")).toBe(true);
    expect(stocks.columns.some((c) => c.key === "__totalAssetRatio")).toBe(true);

    const pensions = HOLDING_TABLE_CONFIGS.find((c) => c.key === "pensions");
    expect(pensions.columns.some((c) => c.key === "__riskAssetRatio")).toBe(true);
    expect(pensions.columns.some((c) => c.key === "__totalAssetRatio")).toBe(true);
  });

  it("computes risk asset summary including pensions", () => {
    const summary = riskAssetSummary({
      ...EMPTY_HOLDINGS,
      stocks: [{ 評価額: "100", 前日比: "10", 評価損益: "20" }],
      funds: [{ 評価額: "300", 前日比: "-20", 評価損益: "-30" }, { 評価額: "not number" }],
      pensions: [{ 現在価値: "500", 評価損益: "50" }],
    });

    // totalYen: 100 + 300 + 0 + 500 = 900
    expect(summary.totalYen).toBe(900);
    // dailyMoves: only stocks/funds [10, -20]
    expect(summary.dailyMoves).toEqual([10, -20]);
    expect(summary.dailyMoveTotal).toBe(-10);
    // totalProfitYen: 20 + (-30) + 50 = 40
    expect(summary.totalProfitYen).toBe(40);
    // totalProfitRatePct: principal = 900 - 40 = 860. 40 / 860 * 100 = 4.651...
    expect(summary.totalProfitRatePct).toBeCloseTo(4.65, 2);
  });

  it("builds stock tiles sorted by valuation", () => {
    const tiles = stockTiles([
      { 銘柄名: "A", 評価額: "200", 前日比: "10", 評価損益: "50" },
      { 銘柄名: "B", 評価額: "100", 前日比: "-1" },
      { 銘柄名: "C", 評価額: "0", 前日比: "0" },
    ]);

    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toMatchObject({
      name: "A",
      value: 200,
      dailyChange: 10,
      profit: 50,
      isNegative: false,
    });
    expect(tiles[1]).toMatchObject({
      name: "B",
      value: 100,
      dailyChange: -1,
      isNegative: true,
    });
    expect(tiles[0].width * tiles[0].height).toBeGreaterThan(tiles[1].width * tiles[1].height);
  });

  it("aggregates fund tiles by name", () => {
    const funds = [
      { 銘柄名: "Fund A", 評価額: "200", 前日比: "10", 評価損益: "20", 保有金融機関: "Bank X" },
      { 銘柄名: "Fund A", 評価額: "100", 前日比: "5", 評価損益: "10", 保有金融機関: "Bank Y" },
      { 銘柄名: "Fund B", 評価額: "500", 前日比: "-10", 評価損益: "-50", 保有金融機関: "Bank Z" },
    ];

    const tiles = fundTiles(funds);

    expect(tiles).toHaveLength(2);
    // Sorted by value (Fund B: 500, Fund A: 300)
    expect(tiles[0].name).toBe("Fund B");
    expect(tiles[1].name).toBe("Fund A");
    expect(tiles[1].value).toBe(300);
    expect(tiles[1].dailyChange).toBe(15);
    expect(tiles[1].profit).toBe(30);
    expect(tiles[1].details).toHaveLength(2);
    expect(tiles[1].details[0]).toEqual({ institution: "Bank X", value: 200 });
    expect(tiles[1].details[1]).toEqual({ institution: "Bank Y", value: 100 });
  });

  it("handles empty or non-array stocks in stockTiles", () => {
    expect(stockTiles([])).toEqual([]);
    expect(stockTiles(null)).toEqual([]);
    expect(stockTiles([{ 評価額: "0" }])).toEqual([]);
  });

  it("handles same valuation in stockTiles sort", () => {
    const tiles = stockTiles([
      { 銘柄名: "B", 評価額: "100" },
      { 銘柄名: "A", 評価額: "100" },
    ]);
    expect(tiles[0].name).toBe("B"); // Stable sort by original index
    expect(tiles[1].name).toBe("A");
  });

  it("triggers vertical split and deep treemap layout", () => {
    const manyStocks = [
      { 銘柄名: "A", 評価額: "1000" },
      { 銘柄名: "B", 評価額: "1000" },
      { 銘柄名: "C", 評価額: "1000" },
      { 銘柄コード: "D-CODE", 評価額: "1000" },
    ];
    const tiles = stockTiles(manyStocks);
    expect(tiles).toHaveLength(4);
    expect(tiles.every(t => t.width > 0 && t.height > 0)).toBe(true);

    // D should have name from code
    expect(tiles.find(t => t.value === 1000 && t.name === "D-CODE")).toBeDefined();
  });

  it("exercises complex treemap splitting logic", () => {
    const stocks = [
      { 銘柄名: "A", 評価額: "10" },
      { 銘柄名: "B", 評価額: "10" },
      { 銘柄名: "C", 評価額: "10" },
      { 銘柄名: "D", 評価額: "10" },
      { 銘柄名: "E", 評価額: "10" },
      { 銘柄名: "F", 評価額: "100" },
    ];
    const tiles = stockTiles(stocks);
    expect(tiles).toHaveLength(6);
  });

  it("handles aggregation with missing optional fields", () => {
    const funds = [
      { 銘柄名: "Fund X", 評価額: "100" },
      { 名称: "Fund X", 現在価値: "200" },
    ];
    const tiles = fundTiles(funds);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].name).toBe("Fund X");
    expect(tiles[0].value).toBe(300);
  });

  it("handles various fallbacks in aggregation", () => {
    const funds = [
      { 評価額: "100" }, // missing name -> 名称未設定
      { 銘柄名: "A" }, // missing value -> 0 (filtered out)
      { 銘柄名: "B", 評価額: "100", 評価損益: "10", 前日比: "5" } // institution missing -> 不明
    ];
    const tiles = fundTiles(funds);
    expect(tiles).toHaveLength(2);
    expect(tiles.find(t => t.value === 100 && t.name === "名称未設定")).toBeDefined();
    const b = tiles.find(t => t.name === "B");
    expect(b.details[0].institution).toBe("不明");
  });

  it("handles same valuation in fundTiles sort (no idx)", () => {
    const funds = [
      { 銘柄名: "B", 評価額: "100" },
      { 銘柄名: "A", 評価額: "100" },
    ];
    const tiles = fundTiles(funds);
    expect(tiles).toHaveLength(2);
    // Since idx is undefined for both, it uses 0 - 0 = 0
  });

  it("handles missing name fields", () => {
    const tiles = stockTiles([
      { 銘柄コード: "1234", 評価額: "100" },
      { 評価額: "200" },
    ]);
    expect(tiles.find(t => t.value === 100).name).toBe("1234");
    expect(tiles.find(t => t.value === 200).name).toBe("名称未設定");
  });

  it("handles null input in stockFundRows", () => {
    expect(stockFundRows(null)).toEqual([]);
  });

  it("treats non-array stock/fund values as empty", () => {
    expect(
      stockFundRows({
        ...EMPTY_HOLDINGS,
        stocks: null,
        funds: [{ 評価額: "100" }],
      }),
    ).toEqual([{ 評価額: "100" }]);
  });

  it("ignores malformed rows when calculating risk asset profit totals", () => {
    const summary = riskAssetSummary({
      ...EMPTY_HOLDINGS,
      stocks: [null, { 評価額: "100" }],
      funds: [{ 評価額: "200", 評価損益: "20" }],
      pensions: [{ 現在価値: "500" }],
    });

    expect(summary.totalYen).toBe(800);
    expect(summary.totalProfitYen).toBe(20);
  });

  it("builds pension tiles with aggregation", () => {
    const pensions = [
      { 名称: "Pension A", 現在価値: "500", 評価損益: "50" },
      { 名称: "Pension A", 現在価値: "500", 評価損益: "50" },
      { 名称: "Pension B", 現在価値: "2000" },
    ];
    const tiles = pensionTiles(pensions);
    expect(tiles).toHaveLength(2);
    expect(tiles[0].name).toBe("Pension B");
    expect(tiles[1].name).toBe("Pension A");
    expect(tiles[1].value).toBe(1000);
    expect(tiles[1].profit).toBe(100);
  });

  it("builds allRiskTiles by combining stocks, funds, and pensions", () => {
    const holdings = {
      stocks: [{ 銘柄名: "Asset A", 評価額: "100" }],
      funds: [{ 銘柄名: "Asset A", 評価額: "200" }, { 銘柄名: "Asset B", 評価額: "500" }],
      pensions: [{ 名称: "Asset B", 現在価値: "500" }, { 名称: "Asset C", 現在価値: "1100" }],
    };

    const tiles = allRiskTiles(holdings);

    // Asset C: 1100
    // Asset B: 1000 (500 + 500)
    // Asset A: 300 (100 + 200)
    expect(tiles).toHaveLength(3);
    expect(tiles[0].name).toBe("Asset C");
    expect(tiles[0].value).toBe(1100);
    expect(tiles[1].name).toBe("Asset B");
    expect(tiles[1].value).toBe(1000);
    expect(tiles[2].name).toBe("Asset A");
    expect(tiles[2].value).toBe(300);
  });

  it("handles null/missing categories in allRiskTiles", () => {
    const tiles = allRiskTiles(null);
    expect(tiles).toEqual([]);

    const tiles2 = allRiskTiles({ stocks: [{ 銘柄名: "S", 評価額: "10" }] });
    expect(tiles2).toHaveLength(1);
    expect(tiles2[0].name).toBe("S");
  });

  describe("getYahooSymbol", () => {
    it("returns .T symbol for 4-digit code", () => {
      expect(getYahooSymbol("5020")).toBe("5020.T");
    });

    it("returns .T symbol for 5-digit code (first 4 digits)", () => {
      expect(getYahooSymbol("13570")).toBe("1357.T");
    });

    it("returns the same code if it is alphabetic (US stocks)", () => {
      expect(getYahooSymbol("AAPL")).toBe("AAPL");
    });

    it("returns null for other patterns", () => {
      expect(getYahooSymbol("123")).toBeNull();
      expect(getYahooSymbol("ABC1")).toBeNull();
      expect(getYahooSymbol(null)).toBeNull();
    });
  });

  describe("stockPriceUrl", () => {
    it("returns Yahoo Finance JP URL for numeric codes", () => {
      expect(stockPriceUrl("Eneos", "5020")).toBe("https://finance.yahoo.co.jp/quote/5020.T?term=1d");
    });

    it("returns Yahoo Finance US URL for alphabetic symbols", () => {
      expect(stockPriceUrl("Apple", "AAPL")).toBe("https://finance.yahoo.com/quote/AAPL/");
    });

    it("returns Google Search URL for unknown patterns", () => {
      const url = stockPriceUrl("Custom Asset", "??");
      expect(url).toContain("google.com/search");
      expect(url).toContain("Custom%20Asset");
    });
  });

  describe("generateStockCsv", () => {
    it("generates CSV with Yahoo symbols and quantities", () => {
      const stocks = [
        { "銘柄コード": "5020", "保有数": "100" },
        { "銘柄コード": "AAPL", "数量": "10" },
        { "銘柄コード": "13570", "保有数": "5" },
      ];
      const csv = generateStockCsv(stocks);
      expect(csv).toBe("5020.T,100\nAAPL,10\n1357.T,5");
    });

    it("uses raw code as fallback if it's not a Yahoo symbol", () => {
      const stocks = [{ "銘柄コード": "UNKNOWN", "保有数": "1" }];
      expect(generateStockCsv(stocks)).toBe("UNKNOWN,1");
    });

    it("returns empty string for empty input", () => {
      expect(generateStockCsv([])).toBe("");
      expect(generateStockCsv(null)).toBe("");
    });
  });
});
