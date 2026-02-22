import { describe, it, expect, vi, afterEach } from "vitest";
import * as cashFlowDomain from "./cashFlow";
import {
  filterCashFlow,
  getKPIs,
  aggregateByMonth,
  aggregateByCategory,
  getRecentAverages,
  getUniqueMonths,
  getUniqueCategories,
  getUniqueLargeCategories,
  getUniqueSmallCategories,
  sortCashFlow,
  getExpenseType,
  aggregateByType,
} from "./cashFlow";


afterEach(() => {
  vi.useRealTimers();
});

const mockCashFlow = [
  { date: "2026-02-12", amount: -3000, category: "Food/Grocery", isTransfer: false, name: "Super" },
  { date: "2026-02-11", amount: 5000, category: "", isTransfer: true, name: "Charge" },
  { date: "2026-02-10", amount: 300000, category: "Salary", isTransfer: false, name: "Job" },
  { date: "2026-01-05", amount: -80000, category: "Rent", isTransfer: false, name: "Home" },
  { date: "2026-01-01", amount: -1000, category: "Food/Dining", isTransfer: false, name: "Restaurant" },
];

describe("cashFlow domain", () => {

  describe("public API safety net", () => {
    it("keeps expected exported functions on the cashFlow barrel", () => {
      expect(cashFlowDomain).toMatchObject({
        getExpenseType: expect.any(Function),
        filterCashFlow: expect.any(Function),
        sortCashFlow: expect.any(Function),
        getKPIs: expect.any(Function),
        aggregateByMonth: expect.any(Function),
        getRecentAverages: expect.any(Function),
        aggregateByCategory: expect.any(Function),
        aggregateByType: expect.any(Function),
        getUniqueMonths: expect.any(Function),
        getUniqueCategories: expect.any(Function),
        getUniqueLargeCategories: expect.any(Function),
        getUniqueSmallCategories: expect.any(Function),
      });
    });
  });

  describe("getExpenseType", () => {
    it("classifies transfers as exclude", () => {
      expect(getExpenseType({ isTransfer: true })).toBe("exclude");
      expect(getExpenseType({ isTransfer: true, category: "住宅/ローン返済" })).toBe("exclude");
    });

    it("classifies special prefixes as exclude", () => {
      expect(getExpenseType("特別な支出/冠婚葬祭")).toBe("exclude");
      expect(getExpenseType("現金/引き出し")).toBe("exclude");
      expect(getExpenseType("カード/支払")).toBe("exclude");
    });

    it("handles objects without category", () => {
      expect(getExpenseType({ isTransfer: false })).toBe("variable");
    });

    it("handles null or empty input", () => {
      expect(getExpenseType(null)).toBe("variable");
      expect(getExpenseType("")).toBe("variable");
    });

    it("handles non-string categories safely", () => {
      expect(getExpenseType({ isTransfer: false, category: 1234 })).toBe("variable");
      expect(getExpenseType(1234)).toBe("variable");
    });

    it("classifies fixed expenses", () => {
      expect(getExpenseType("住宅/ローン返済")).toBe("fixed");
      expect(getExpenseType({ isTransfer: false, category: "住宅/ローン返済" })).toBe("fixed");
      expect(getExpenseType("住宅/管理費")).toBe("fixed");
      expect(getExpenseType("水道・光熱費")).toBe("fixed");
      expect(getExpenseType("教養・教育/学費")).toBe("fixed");
      expect(getExpenseType("保険/生命保険")).toBe("fixed");
      expect(getExpenseType("通信費/携帯電話")).toBe("fixed");
      expect(getExpenseType("健康・医療/病院")).toBe("fixed");
      expect(getExpenseType("食費/食費")).toBe("fixed");
      expect(getExpenseType("食費/食料品")).toBe("fixed");
      expect(getExpenseType("日用品/雑貨")).toBe("fixed");
      expect(getExpenseType("衣服・美容/美容院・理髪")).toBe("fixed");
    });

    it("classifies excluded expenses", () => {
      expect(getExpenseType("カード引き落とし")).toBe("exclude");
      expect(getExpenseType("ATM引き出し")).toBe("exclude");
      expect(getExpenseType("電子マネー")).toBe("exclude");
      expect(getExpenseType("使途不明金")).toBe("exclude");
      expect(getExpenseType("収入/給与")).toBe("exclude");
    });

    it("classifies everything else as variable", () => {
      expect(getExpenseType("食費/外食")).toBe("variable");
      expect(getExpenseType("趣味・娯楽")).toBe("variable");
      expect(getExpenseType("未分類")).toBe("variable");
    });
  });

  describe("filterCashFlow", () => {
    it("returns all when no filters provided", () => {
      expect(filterCashFlow(mockCashFlow)).toHaveLength(5);
    });

    it("filters by type", () => {
      const mixed = [
        { category: "住宅/ローン返済", amount: -100000, name: "Loan" }, // fixed
        { category: "食費", amount: -500, name: "Food" }, // variable
        { category: "ATM引き出し", amount: -10000, name: "ATM" }, // exclude
      ];
      expect(filterCashFlow(mixed, { type: "fixed" })).toHaveLength(1);
      expect(filterCashFlow(mixed, { type: "variable" })).toHaveLength(1);
      expect(filterCashFlow(mixed, { type: "exclude" })).toHaveLength(1);
    });

    it("filters by largeCategory", () => {
      expect(filterCashFlow(mockCashFlow, { largeCategory: "Food" })).toHaveLength(2);
      expect(filterCashFlow(mockCashFlow, { largeCategory: "Salary" })).toHaveLength(1);
      expect(filterCashFlow(mockCashFlow, { largeCategory: "未分類" })).toHaveLength(1);
    });

    it("filters by smallCategory", () => {
      expect(filterCashFlow(mockCashFlow, { largeCategory: "Food", smallCategory: "Grocery" })).toHaveLength(1);
      expect(filterCashFlow(mockCashFlow, { largeCategory: "Food", smallCategory: "Dining" })).toHaveLength(1);
      expect(filterCashFlow(mockCashFlow, { largeCategory: "Salary", smallCategory: "Dining" })).toHaveLength(0);
    });

    it("filters by month", () => {
      expect(filterCashFlow(mockCashFlow, { month: "2026-02" })).toHaveLength(3);
    });

    it("filters by category (exact match)", () => {
      expect(filterCashFlow(mockCashFlow, { category: "Food/Grocery" })).toHaveLength(1);
      expect(filterCashFlow(mockCashFlow, { category: "Food" })).toHaveLength(0);
    });

    it("filters by search", () => {
      expect(filterCashFlow(mockCashFlow, { search: "Food" })).toHaveLength(2);
      expect(filterCashFlow(mockCashFlow, { search: "Grocery" })).toHaveLength(1);
      expect(filterCashFlow(mockCashFlow, { search: "restaurant" })).toHaveLength(1);
    });

    it("does not throw when searching rows with missing name", () => {
      const rows = [
        { date: "2026-02-01", amount: -1000, category: "Food", isTransfer: false },
      ];

      expect(filterCashFlow(rows, { search: "food" })).toHaveLength(1);
    });

    it("treats non-string category values as uncategorized", () => {
      const rows = [
        { date: "2026-02-01", amount: -1000, category: 0, isTransfer: false, name: "A" },
      ];

      expect(filterCashFlow(rows, { largeCategory: "未分類" })).toHaveLength(1);
      expect(getUniqueCategories(rows)).toEqual(["未分類"]);
    });

    it("can exclude transfer rows", () => {
      expect(filterCashFlow(mockCashFlow, { includeTransfers: false })).toHaveLength(4);
    });
  });

  describe("getUniqueLargeCategories", () => {
    it("returns sorted unique large categories", () => {
      expect(getUniqueLargeCategories(mockCashFlow)).toEqual(["Food", "Rent", "Salary", "未分類"]);
    });
  });

  describe("getUniqueSmallCategories", () => {
    it("returns sorted unique small categories for a large category", () => {
      expect(getUniqueSmallCategories(mockCashFlow, "Food")).toEqual(["Dining", "Grocery"]);
      expect(getUniqueSmallCategories(mockCashFlow, "Salary")).toEqual([]);
      expect(getUniqueSmallCategories(mockCashFlow, "未分類")).toEqual([]);
    });

    it("returns empty when largeCategory is not provided", () => {
      expect(getUniqueSmallCategories(mockCashFlow, "")).toEqual([]);
      expect(getUniqueSmallCategories(mockCashFlow)).toEqual([]);
    });
  });

  describe("sortCashFlow", () => {
    it("sorts by date asc", () => {
      const sorted = sortCashFlow(mockCashFlow, "date", "asc");
      expect(sorted[0].date).toBe("2026-01-01");
      expect(sorted[4].date).toBe("2026-02-12");
    });

    it("sorts by date desc", () => {
      const sorted = sortCashFlow(mockCashFlow, "date", "desc");
      expect(sorted[0].date).toBe("2026-02-12");
      expect(sorted[4].date).toBe("2026-01-01");
    });

    it("sorts by amount asc", () => {
      const sorted = sortCashFlow(mockCashFlow, "amount", "asc");
      expect(sorted[0].amount).toBe(-80000);
      expect(sorted[4].amount).toBe(300000);
    });

    it("sorts by category asc handling 未分類", () => {
      const sorted = sortCashFlow(mockCashFlow, "category", "asc");
      expect(sorted[0].category).toBe("Food/Dining");
      expect(sorted[4].category).toBe("");
    });

    it("returns original reference when sortKey is missing", () => {
      expect(sortCashFlow(mockCashFlow)).toBe(mockCashFlow);
    });

    it("keeps equal values when comparator returns 0", () => {
      const sameAmount = [
        { date: "2026-02-01", amount: 1, category: "A", isTransfer: false, name: "a" },
        { date: "2026-02-02", amount: 1, category: "B", isTransfer: false, name: "b" },
      ];
      const sorted = sortCashFlow(sameAmount, "amount", "asc");
      expect(sorted).toEqual(sameAmount);
    });

    it("handles greater-than branch in descending order", () => {
      const values = [
        { date: "2026-02-01", amount: 2, category: "A", isTransfer: false, name: "a" },
        { date: "2026-02-02", amount: 1, category: "B", isTransfer: false, name: "b" },
      ];
      const sorted = sortCashFlow(values, "amount", "desc");
      expect(sorted[0].amount).toBe(2);
    });

    it("handles greater-than branch in ascending order", () => {
      const values = [
        { date: "2026-02-01", amount: 2, category: "A", isTransfer: false, name: "a" },
        { date: "2026-02-02", amount: 1, category: "B", isTransfer: false, name: "b" },
      ];
      const sorted = sortCashFlow(values, "amount", "asc");
      expect(sorted[0].amount).toBe(1);
    });
  });

  describe("aggregateByMonth", () => {
    it("aggregates filtered monthly values with fixed and variable breakdown", () => {
      const mixed = [
        { date: "2026-01-01", amount: -1000, category: "住宅/ローン返済", isTransfer: false }, // fixed
        { date: "2026-01-02", amount: -2000, category: "食費/外食", isTransfer: false }, // variable
        { date: "2026-01-03", amount: -3000, category: "カード引き落とし", isTransfer: false }, // exclude
        { date: "2026-01-10", amount: 10000, category: "収入/給与", isTransfer: false }, // income
      ];
      expect(aggregateByMonth(mixed)).toEqual([
        {
          month: "2026-01",
          income: 10000,
          expense: 6000,
          net: 4000,
          fixed: 1000,
          variable: 2000,
          exclude: 3000,
        },
      ]);
    });

    it("aggregates filtered monthly values", () => {
      const filtered = filterCashFlow(mockCashFlow, { largeCategory: "Food" });
      expect(aggregateByMonth(filtered)).toEqual([
        {
          month: "2026-01",
          income: 0,
          expense: 1000,
          net: -1000,
          fixed: 0,
          variable: 1000,
          exclude: 0,
        },
        {
          month: "2026-02",
          income: 0,
          expense: 3000,
          net: -3000,
          fixed: 0,
          variable: 3000,
          exclude: 0,
        },
      ]);
    });

    it("skips net calculations when includeNet is false", () => {
      const filtered = filterCashFlow(mockCashFlow, { largeCategory: "Food" });
      expect(aggregateByMonth(filtered, { includeNet: false })).toEqual([
        {
          month: "2026-01",
          income: 0,
          expense: 1000,
          net: 0,
          fixed: 0,
          variable: 1000,
          exclude: 0,
        },
        {
          month: "2026-02",
          income: 0,
          expense: 3000,
          net: 0,
          fixed: 0,
          variable: 3000,
          exclude: 0,
        },
      ]);
    });

    it("ignores transfers and invalid month formats", () => {
      const mixed = [
        ...mockCashFlow,
        { date: "", amount: 10, category: "Misc", isTransfer: false, name: "InvalidDate" },
      ];
      const aggregated = aggregateByMonth(mixed);
      expect(aggregated.find((row) => row.month === "")).toBeUndefined();
      expect(aggregated).toEqual([
        {
          month: "2026-01",
          income: 0,
          expense: 81000,
          net: -81000,
          fixed: 0,
          variable: 81000,
          exclude: 0,
        },
        {
          month: "2026-02",
          income: 300000,
          expense: 3000,
          net: 297000,
          fixed: 0,
          variable: 3000,
          exclude: 0,
        },
      ]);
    });
  });

  describe("getRecentAverages", () => {
    it("returns averages for up to latest 6 months", () => {
      const monthly = [
        { month: "2025-09", income: 100, expense: 10, net: 90 },
        { month: "2025-10", income: 200, expense: 20, net: 180 },
        { month: "2025-11", income: 300, expense: 30, net: 270 },
        { month: "2025-12", income: 400, expense: 40, net: 360 },
        { month: "2026-01", income: 500, expense: 50, net: 450 },
        { month: "2026-02", income: 600, expense: 60, net: 540 },
        { month: "2026-03", income: 700, expense: 70, net: 630 },
      ];

      expect(getRecentAverages(monthly)).toEqual({
        income: 450,
        expense: 45,
        net: 405,
        fixed: 0,
        variable: 0,
        exclude: 0,
        count: 6,
      });
    });

    it("returns zeros for empty input", () => {
      expect(getRecentAverages([])).toEqual({
        income: 0,
        expense: 0,
        net: 0,
        fixed: 0,
        variable: 0,
        exclude: 0,
        count: 0,
      });
    });
  });

  describe("getKPIs", () => {
    it("calculates correct KPIs", () => {
      const kpis = getKPIs(mockCashFlow);
      expect(kpis).toEqual({
        income: 300000,
        expense: -84000,
        net: 216000,
        transfers: 5000,
      });
    });
  });

  describe("aggregateByType", () => {
    it("aggregates by expense type", () => {
      const mixed = [
        { date: "2026-02-01", amount: -1000, category: "住宅/ローン返済", isTransfer: false },
        { date: "2026-02-01", amount: -2000, category: "食費/外食", isTransfer: false },
        { date: "2026-02-01", amount: -3000, category: "カード引き落とし", isTransfer: false },
      ];
      const result = aggregateByType(mixed);
      expect(result).toContainEqual({ label: "固定費", value: 1000, color: "#38bdf8" });
      expect(result).toContainEqual({ label: "変動費", value: 2000, color: "#f59e0b" });
      expect(result).toContainEqual({ label: "除外", value: 3000, color: "#4b5563" });
    });

    it("excludes transfers and ignores positive amounts", () => {
      const mixed = [
        { date: "2026-02-01", amount: -1000, category: "住宅/ローン返済", isTransfer: false },
        { date: "2026-02-01", amount: -2000, category: "Transfer", isTransfer: true },
        { date: "2026-02-01", amount: 3000, category: "Income", isTransfer: false },
      ];
      const result = aggregateByType(mixed);
      expect(result).toHaveLength(1);
      expect(result.find(r => r.label === "固定費").value).toBe(1000);
      expect(result.find(r => r.label === "除外")).toBeUndefined();
    });

    it("can average past 5 months using fixed divisor", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T09:00:00+09:00"));

      const rows = [
        { date: "2026-06-05", amount: -99999, category: "住宅/ローン返済", isTransfer: false },
        { date: "2026-05-05", amount: -500, category: "住宅/ローン返済", isTransfer: false },
        { date: "2026-04-05", amount: -400, category: "住宅/ローン返済", isTransfer: false },
        { date: "2026-03-05", amount: -300, category: "住宅/ローン返済", isTransfer: false },
      ];

      // Sum = 500 + 400 + 300 = 1200. Divisor = 5. Result = 240.
      expect(aggregateByType(rows, { averageMonths: 5, excludeCurrentMonth: true })).toEqual([
        { label: "固定費", value: 240, color: "#38bdf8" },
      ]);
    });
  });

  describe("aggregateByCategory", () => {
    it("aggregates expense-only categories sorted desc", () => {
      const withUncategorizedExpense = [
        ...mockCashFlow,
        { date: "2026-02-20", amount: -500, category: "", isTransfer: false, name: "Unknown" },
      ];
      expect(aggregateByCategory(withUncategorizedExpense)).toEqual([
        { label: "Rent", value: 80000 },
        { label: "Food/Grocery", value: 3000 },
        { label: "Food/Dining", value: 1000 },
        { label: "未分類", value: 500 },
      ]);
    });

    it("can average past 5 months excluding current month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T09:00:00+09:00"));

      const rows = [
        { date: "2026-06-05", amount: -99999, category: "Food", isTransfer: false, name: "current" },
        { date: "2026-05-05", amount: -500, category: "Food", isTransfer: false, name: "m5" },
        { date: "2026-04-05", amount: -400, category: "Food", isTransfer: false, name: "m4" },
        { date: "2026-03-05", amount: -300, category: "Food", isTransfer: false, name: "m3" },
        { date: "2026-02-05", amount: -200, category: "Food", isTransfer: false, name: "m2" },
        { date: "2026-01-05", amount: -100, category: "Food", isTransfer: false, name: "m1" },
      ];

      expect(aggregateByCategory(rows, { averageMonths: 5, excludeCurrentMonth: true })).toEqual([
        { label: "Food", value: 300 },
      ]);
    });

    it("includes current month when excludeCurrentMonth is false", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-15T09:00:00+09:00"));

      const rows = [
        { date: "2026-06-05", amount: -500, category: "Food", isTransfer: false, name: "current" },
        { date: "2026-05-05", amount: -400, category: "Food", isTransfer: false, name: "m5" },
        { date: "2026-04-05", amount: -300, category: "Food", isTransfer: false, name: "m4" },
        { date: "2026-03-05", amount: -200, category: "Food", isTransfer: false, name: "m3" },
        { date: "2026-02-05", amount: -100, category: "Food", isTransfer: false, name: "m2" },
      ];

      expect(aggregateByCategory(rows, { averageMonths: 5, excludeCurrentMonth: false })).toEqual([
        { label: "Food", value: 300 },
      ]);
    });

    it("returns empty array when no data in range for coverage", () => {
        expect(aggregateByCategory([], { averageMonths: 1 })).toEqual([]);
    });
  });

  describe("getUniqueMonths", () => {
    it("returns months in descending order", () => {
      const withInvalid = [
        ...mockCashFlow,
        { date: "2026", amount: 1, category: "Misc", isTransfer: false, name: "Bad" },
      ];
      expect(getUniqueMonths(withInvalid)).toEqual(["2026-02", "2026-01"]);
    });
  });

  describe("getUniqueCategories", () => {
    it("returns sorted categories with fallback", () => {
      expect(getUniqueCategories(mockCashFlow)).toEqual(["Food/Dining", "Food/Grocery", "Rent", "Salary", "未分類"]);
    });
  });
});
