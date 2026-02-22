import { describe, expect, it } from "vitest";
import { filterHoldingsByOwner, summarizeByCategory } from "./assetOwners";

describe("assetOwners domain", () => {
  const holdings = {
    cashLike: [
      { "種類・名称": "普通預金", "残高": "100", Owner: "me" },
      { "種類・名称": "普通預金", "残高": "200", Owner: "wife" },
    ],
    stocks: [
      { "銘柄名": "A", "評価額": "1000", owner: "daughter" },
      { "銘柄名": "B", "評価額": "500", "保有金融機関": "test@chipop" },
    ],
    funds: [],
    pensions: [],
    points: [],
    liabilitiesDetail: [],
  };

  it("filters by explicit owner property first", () => {
    const wife = filterHoldingsByOwner(holdings, "wife");
    expect(wife.cashLike).toHaveLength(1);
    expect(wife.cashLike[0]["残高"]).toBe("200");
  });

  it("falls back to owner detection from text", () => {
    const wife = filterHoldingsByOwner(holdings, "wife");
    expect(wife.stocks).toHaveLength(1);
    expect(wife.stocks[0]["銘柄名"]).toBe("B");
  });

  it("summarizes each category amount and count including liability flag", () => {
    const summary = summarizeByCategory(holdings);
    const stock = summary.find((entry) => entry.key === "stocks");
    expect(stock.amountYen).toBe(1500);
    expect(stock.count).toBe(2);
    expect(stock.isLiability).toBe(false);

    const liability = summary.find((entry) => entry.key === "liabilitiesDetail");
    expect(liability.isLiability).toBe(true);
  });

  it("returns original holdings for all filter and handles nullish input", () => {
    expect(filterHoldingsByOwner(holdings, "all")).toBe(holdings);

    const emptySummary = summarizeByCategory();
    expect(emptySummary.every((entry) => entry.amountYen === 0 && entry.count === 0)).toBe(true);
  });

  it("converts non-array category values to empty arrays while filtering", () => {
    const malformed = {
      ...holdings,
      stocks: null,
    };

    const daughter = filterHoldingsByOwner(malformed, "daughter");
    expect(daughter.stocks).toEqual([]);
  });

  it("uses EMPTY_HOLDINGS when holdings is nullish", () => {
    expect(filterHoldingsByOwner(undefined, "wife")).toEqual({
      cashLike: [],
      stocks: [],
      funds: [],
      pensions: [],
      points: [],
      liabilitiesDetail: [],
    });
  });

});
