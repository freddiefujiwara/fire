import { describe, it, expect } from "vitest";
import * as fireDomain from "./fire";
import {
  calculateRiskAssets,
  calculateExcludedOwnerAssets,
  calculateFirePortfolio,
  calculateCashAssets,
  calculateDaughterAssetsBreakdown,
  generateAlgorithmExplanationSegments,
} from "./fire";

describe("fire domain", () => {
  describe("calculateDaughterAssetsBreakdown", () => {
    it("returns zero breakdown for empty input", () => {
      expect(calculateDaughterAssetsBreakdown(null)).toEqual({
        cash: 0, stocks: 0, funds: 0, pensions: 0, points: 0, liabilities: 0
      });
    });

    it("sums daughter assets specifically", () => {
      const portfolio = {
        holdings: {
          cashLike: [{ "名称": "A@aojiru.pudding", "残高": 100 }, { "名称": "B", "残高": 1000 }],
          stocks: [{ "名称": "C@aojiru.pudding", "評価額": 200 }],
          funds: [{ "名称": "D@aojiru.pudding", "評価額": 300 }],
          pensions: [{ "名称": "E@aojiru.pudding", "現在価値": 400 }],
          points: [{ "名称": "F@aojiru.pudding", "残高": 50 }],
          liabilitiesDetail: [{ "名称": "G@aojiru.pudding", "残高": 500 }],
        }
      };
      const result = calculateDaughterAssetsBreakdown(portfolio);
      expect(result).toEqual({
        cash: 100, stocks: 200, funds: 300, pensions: 400, points: 50, liabilities: 500
      });
    });

    it("handles missing categories in holdings", () => {
      const portfolio = { holdings: {} };
      expect(calculateDaughterAssetsBreakdown(portfolio)).toEqual({
        cash: 0, stocks: 0, funds: 0, pensions: 0, points: 0, liabilities: 0
      });
    });
  });

  describe("generateAlgorithmExplanationSegments", () => {
    it("generates expected segments", () => {
      const params = {
        daughterBreakdown: { cash: 100, stocks: 200, funds: 0, pensions: 0, points: 0, liabilities: 0 },
        fireAchievementAge: 45,
        pensionAnnualAtFire: 1200000,
        withdrawalRatePct: 4,
        postFireExtraExpenseMonthly: 60000,
      };
      const segments = generateAlgorithmExplanationSegments(params);
      expect(segments).toBeInstanceOf(Array);
      expect(segments.find(s => s.type === "amount" && s.value.includes("現金:¥100"))).toBeDefined();
      expect(segments.find(s => s.value === "45")).toBeDefined();
    });

    it("generates Monte Carlo explanation segments", () => {
      const params = {
        daughterBreakdown: { cash: 0, stocks: 0, funds: 0, pensions: 0, points: 0, liabilities: 0 },
        fireAchievementAge: 45,
        pensionAnnualAtFire: 1200000,
        withdrawalRatePct: 4,
        postFireExtraExpenseMonthly: 60000,
        useMonteCarlo: true,
        monteCarloTrials: 1000,
        monteCarloVolatilityPct: 15,
      };
      const segments = generateAlgorithmExplanationSegments(params);
      expect(segments.find(s => s.value.includes("モンテカルロ法"))).toBeDefined();
    });
  });

  describe("calculateRiskAssets", () => {
    it("returns 0 for empty portfolio", () => {
      expect(calculateRiskAssets(null)).toBe(0);
      expect(calculateRiskAssets({})).toBe(0);
    });

    it("sums only risk assets (Stocks, Funds, Pension, etc.)", () => {
      const portfolio = {
        summary: {
          assetsByClass: [
            { name: "預金・現金", amountYen: 1000 },
            { name: "株式（現物）", amountYen: 2000 },
            { name: "投資信託", amountYen: 3000 },
            { name: "ポイント・マイル", amountYen: 400 },
            { name: "年金", amountYen: 5000 },
            { name: "債券", amountYen: 6000 },
          ],
        },
      };
      // Risk: 2000 + 3000 + 5000 + 6000 = 16000
      expect(calculateRiskAssets(portfolio)).toBe(16000);
    });
  });

  describe("calculateExcludedOwnerAssets", () => {
    it("returns 0 when holdings are missing", () => {
      expect(calculateExcludedOwnerAssets(null)).toEqual({ totalAssetsYen: 0, riskAssetsYen: 0 });
      expect(calculateExcludedOwnerAssets({})).toEqual({ totalAssetsYen: 0, riskAssetsYen: 0 });
    });

    it("sums only daughter assets and risk assets", () => {
      const portfolio = {
        holdings: {
          cashLike: [
            { "名称・説明": "普通預金@aojiru.pudding", "残高": "100000" },
            { "名称・説明": "普通預金", "残高": "300000" },
          ],
          stocks: [
            { "名称・説明": "株A@aojiru.pudding", "現在価値": "200000" },
            { "名称・説明": "株B", "現在価値": "500000" },
          ],
          funds: [
            { "名称・説明": "投信@aojiru.pudding", "評価額": "300000" },
          ],
          pensions: [
            { "名称・説明": "年金@aojiru.pudding", "現在価値": "400000" },
          ],
          points: [
            { "名称・説明": "ポイント@aojiru.pudding", "残高": "5000" },
          ],
        },
      };

      expect(calculateExcludedOwnerAssets(portfolio, "daughter")).toEqual({
        totalAssetsYen: 1005000,
        riskAssetsYen: 900000,
      });
    });

    it("handles non-array holdings entries", () => {
      const portfolio = {
        holdings: {
          cashLike: { "名称・説明": "普通預金@aojiru.pudding", "残高": "100000" },
          stocks: null,
          funds: undefined,
          pensions: "invalid",
          points: 123,
        },
      };

      expect(calculateExcludedOwnerAssets(portfolio, "daughter")).toEqual({
        totalAssetsYen: 0,
        riskAssetsYen: 0,
      });
    });
  });

  describe("calculateFirePortfolio", () => {
    const portfolio = {
      holdings: {
        cashLike: [
          { category: "預金・現金", "名称・説明": "銀行A", 残高: "1000000" }, // me
          { category: "預金・現金", "名称・説明": "銀行B@chipop", 残高: "500000" }, // wife
          { category: "預金・現金", "名称・説明": "銀行C@aojiru.pudding", 残高: "200000" }, // daughter
        ],
        stocks: [
          { category: "株式（現物）", 銘柄名: "株A", 評価額: "2000000" }, // me
          { category: "株式（現物）", 銘柄名: "株B@aojiru.pudding", 評価額: "300000" }, // daughter
        ],
        liabilitiesDetail: [
          { 種類: "住宅ローン", 残高: "10000000" }, // me
          { 種類: "カード借入@aojiru.pudding", 残高: "5000" }, // daughter
        ],
      },
    };

    it("returns zeros for empty portfolio", () => {
      expect(calculateFirePortfolio(null)).toEqual({
        totalAssetsYen: 0,
        riskAssetsYen: 0,
        cashAssetsYen: 0,
        liabilitiesYen: 0,
        netWorthYen: 0,
      });
    });

    it("aggregates assets and liabilities strictly for me and wife", () => {
      const result = calculateFirePortfolio(portfolio);
      // Assets: me(1M cash, 2M stock) + wife(0.5M cash) = 3.5M
      // Risk: me(2M stock) = 2.0M
      // Cash: 3.5M - 2.0M = 1.5M
      // Liabilities: me(10M loan) = 10M
      // Net Worth: 3.5M - 10M = -6.5M
      expect(result.totalAssetsYen).toBe(3500000);
      expect(result.riskAssetsYen).toBe(2000000);
      expect(result.cashAssetsYen).toBe(1500000);
      expect(result.liabilitiesYen).toBe(10000000);
      expect(result.netWorthYen).toBe(-6500000);
    });

    it("supports custom owner list", () => {
      const result = calculateFirePortfolio(portfolio, ["me"]);
      expect(result.totalAssetsYen).toBe(3000000);
      expect(result.liabilitiesYen).toBe(10000000);
    });

    it("handles missing categories and missing liability section", () => {
      const partialPortfolio = {
        holdings: {
          cashLike: [
            { "名称・説明": "不明な資産", 残高: "50000" } // me, no category
          ]
          // stocks and liabilitiesDetail missing
        }
      };
      const result = calculateFirePortfolio(partialPortfolio);
      expect(result.totalAssetsYen).toBe(50000);
      expect(result.riskAssetsYen).toBe(0);
      expect(result.liabilitiesYen).toBe(0);
    });


    it("treats stocks/funds/pensions as risk even if category is missing", () => {
      const partialPortfolio = {
        holdings: {
          stocks: [
            { "銘柄名": "株A", "評価額": "100000" },
          ],
          funds: [
            { "名称・説明": "投信A@chipop", "評価額": "200000" },
          ],
          pensions: [
            { "名称": "年金A", "現在価値": "300000" },
          ],
        },
      };

      const result = calculateFirePortfolio(partialPortfolio);
      expect(result.totalAssetsYen).toBe(600000);
      expect(result.riskAssetsYen).toBe(600000);
      expect(result.cashAssetsYen).toBe(0);
    });
  });

  describe("calculateCashAssets", () => {
    it("returns 0 for empty portfolio", () => {
      expect(calculateCashAssets(null)).toBe(0);
    });

    it("calculates total assets minus risk assets", () => {
      const portfolio = {
        totals: { assetsYen: 10000 },
        summary: {
          assetsByClass: [
            { name: "預金・現金", amountYen: 4000 },
            { name: "株式（現物）", amountYen: 6000 },
          ],
        },
      };
      // Total 10000, Risk 6000 -> Cash 4000
      expect(calculateCashAssets(portfolio)).toBe(4000);
    });
  });


});
