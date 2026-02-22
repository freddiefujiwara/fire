import { describe, it, expect, vi } from "vitest";
import * as fireDomain from "./fire";
import {
  generateGrowthTable,
  generateAnnualSimulation,
  calculateMonthlyPension,
  normalizeFireParams,
  performFireSimulation,
  calculateLifestyleReduction,
  generateAlgorithmExplanationSegments,
} from "./fire";

describe("fire domain", () => {
  describe("generateAlgorithmExplanationSegments", () => {
    it("shows family structure change section when householdType is family and children are set", () => {
      const segments = generateAlgorithmExplanationSegments({
        fireAchievementAge: 45,
        pensionAnnualAtFire: 1200000,
        withdrawalRatePct: 4,
        postFireExtraExpenseMonthly: 60000,
        postFireFirstYearExtraExpense: 0,
        retirementLumpSumAtFire: 5000000,
        useMonteCarlo: false,
        monteCarloTrials: 1000,
        monteCarloVolatilityPct: 15,
        householdType: "family",
        dependentBirthDates: ["2015-01-01"],
        independenceAge: 24,
      });

      const text = segments.map((seg) => seg.value).join("");
      expect(text).toContain("■ 家族構成の変化（子の独立）について");
    });
  });

  it("keeps expected exported functions on the fire barrel", () => {
    expect(fireDomain).toMatchObject({
      calculateMonthlyPension: expect.any(Function),
      generateAlgorithmExplanationSegments: expect.any(Function),
      calculateLifestyleReduction: expect.any(Function),
      normalizeFireParams: expect.any(Function),
      performFireSimulation: expect.any(Function),
      generateGrowthTable: expect.any(Function),
      generateAnnualSimulation: expect.any(Function),
      runMonteCarloSimulation: expect.any(Function),
    });
  });
  describe("normalizeFireParams", () => {
    it("returns default values for empty input", () => {
      const result = normalizeFireParams({});
      expect(result.currentAge).toBe(40);
      expect(result.maxMonths).toBe(1200);
      expect(result.withdrawalRate).toBe(0.04);
      expect(result.inflationRate).toBe(0.02);
      expect(result.taxRate).toBe(0.20315);
    });

    it("handles null/undefined input safely", () => {
      expect(normalizeFireParams(null).currentAge).toBe(40);
      expect(normalizeFireParams(undefined).currentAge).toBe(40);
    });

    it("parses numeric strings", () => {
      const result = normalizeFireParams({ currentAge: "45", initialAssets: "1000" });
      expect(result.currentAge).toBe(45);
      expect(result.initialAssets).toBe(1000);
    });

    it("handles null/undefined in calculateLifestyleReduction", () => {
      expect(calculateLifestyleReduction(null)).toBe(1.0);
      expect(calculateLifestyleReduction([])).toBe(1.0);
      expect(calculateLifestyleReduction([{ name: "Other", amount: 0 }])).toBe(1.0);
    });

    it("respects provided falsey but non-null values", () => {
      const result = normalizeFireParams({ currentAge: 0, initialAssets: 0 });
      expect(result.currentAge).toBe(40); // 0 is treated as missing and falls back to 40
      expect(result.initialAssets).toBe(0); // initialAssets uses ?? 0, so 0 is kept
    });
  });

  describe("generateGrowthTable", () => {
    const params = {
      initialAssets: 10000000, retirementLumpSumAtFire: 0,
      riskAssets: 5000000,
      monthlyInvestment: 100000,
      annualReturnRate: 0.05,
      monthlyExpense: 200000,
      maxMonths: 12,
    };

    it("generates a table of asset growth", () => {
      const result = generateGrowthTable(params);
      expect(result.table).toHaveLength(13); // 0 to 12
      expect(result.table[0].assets).toBe(10000000);
      expect(result.table[1].assets).toBeGreaterThan(0);
    });

    it("detects FIRE reached month and stops investment / performs withdrawal based on withdrawalRate", () => {
      const initialAssets = 500000000;
      const result = generateGrowthTable({
        ...params,
        initialAssets, // 500M survives even with 0% return
        monthlyExpense: 100000,
        annualReturnRate: 0,
        currentAge: 40,
        withdrawalRate: 0.03, // 3% of 500M = 15M/year = 1.25M/month
      });
      expect(result.fireReachedMonth).toBe(0);
      expect(result.table[0].isFire).toBe(true);
      // month 0 assets: 500,000,000
      // 3% withdrawal: 500,000,000 * 0.03 / 12 = 1,250,000
      // monthlyExpense: 100,000
      // withdrawal = max(100k, 1.25M) = 1,250,000
      // month 1 assets: 500,000,000 - 1,250,000 + (1,250,000 - 100,000) = 499,900,000
      expect(result.table[1].assets).toBeCloseTo(499900000, 0);
    });

    it("depletes exactly at age 100 in deterministic table if returns=0", () => {
      // If returns=0 and inflation=0, requiredAssets = expense * remainingMonths
      const currentAge = 90;
      const remainingMonths = (100 - 90) * 12; // 120 months
      const monthlyExpense = 100000;
      const required = monthlyExpense * remainingMonths; // 12,000,000

      const result = generateGrowthTable({
        initialAssets: required, retirementLumpSumAtFire: 0,
        riskAssets: 0,
        monthlyInvestment: 0,
        annualReturnRate: 0,
        monthlyExpense,
        currentAge,
        includeInflation: false,
      });

      expect(result.fireReachedMonth).toBe(0);
      expect(result.table[remainingMonths].assets).toBeCloseTo(0);
    });

    it("handles tax and inflation", () => {
      const result = generateGrowthTable({
        ...params,
        includeInflation: true,
        includeTax: true,
      });
      // With backward calculation, required assets at month 1 should be less than at month 0
      // because you have one less month to live.
      expect(result.table[1].requiredAssets).toBeLessThan(result.table[0].requiredAssets);
    });

    it("does NOT gross up withdrawal by taxRate if there is no gain (tax on gain only)", () => {
      const initialAssets = 500000000;
      const monthlyExpense = 100000;
      const taxRate = 0.2; // 20%
      const result = generateGrowthTable({
        ...params,
        initialAssets,
        riskAssets: initialAssets, // costBasis = 500M
        monthlyExpense,
        includeTax: true,
        taxRate,
        annualReturnRate: 0, // No gain
        withdrawalRate: 0, retirementLumpSumAtFire: 0,
      });
      // Post-FIRE withdrawal should be 100,000 because Gain is 0.
      expect(result.fireReachedMonth).toBe(0);
      expect(result.table[1].assets).toBe(initialAssets - 100000);
    });

    it("increases requiredAssets and withdrawal when postFireExtraExpense is provided", () => {
      const initialAssets = 500000000;
      const monthlyExpense = 100000;
      const postFireExtraExpense = 50000;
      const result = generateGrowthTable({
        ...params,
        initialAssets,
        monthlyExpense,
        postFireExtraExpense,
        annualReturnRate: 0,
        withdrawalRate: 0, retirementLumpSumAtFire: 0,
      });
      // Post-FIRE withdrawal should be 100,000 + 50,000 = 150,000
      expect(result.fireReachedMonth).toBe(0);
      expect(result.table[1].assets).toBe(initialAssets - 150000);
      // requiredAssets at m=0 for 40->100 age (720 months)
      // should be (100k + 50k) * 720 = 108,000,000
      expect(result.table[0].requiredAssets).toBe(108000000);
    });

    it("handles tax impact when cash is negative in accumulation phase", () => {
      const result = generateGrowthTable({
        initialAssets: 1000, retirementLumpSumAtFire: 0,
        riskAssets: 1000,
        annualReturnRate: 0,
        monthlyIncome: 0,
        monthlyExpense: 2000,
        includeTax: true,
        taxRate: 0.2,
        maxMonths: 1,
      });
      // Month 0: cash 0, risk 1000.
      // Month 1: growth 0. cash = 0 + 0 - 2000 = -2000.
      // shortfall 2000. taxImpact = (2000 / 0.8) - 2000 = 2500 - 2000 = 500.
      // currentRisk = 1000 - 500 = 500.
      // Total assets = -2000 + 500 = -1500 -> capped at 0.
      expect(result.table[1].assets).toBe(0);
    });

    it("sets assets to 0 if they go negative", () => {
      const result = generateGrowthTable({
        ...params,
        initialAssets: 1000, retirementLumpSumAtFire: 0,
        monthlyInvestment: 0,
        monthlyExpense: 1000000,
      });
      expect(result.table[1].assets).toBe(0);
      expect(result.table[1].isFire).toBe(false);
    });

    it("applies daughter independence reduction starting from 2037-04", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-05-14T09:00:00+09:00"));
      const expenseBreakdown = [
        { name: "食費", amount: 60000 }, // reduces by 1/3 -> 40000
        { name: "住居", amount: 80000 }, // no change
      ];
      const params = {
        initialAssets: 100000000,
        riskAssets: 0,
        monthlyExpense: 140000,
        currentAge: 45,
        expenseBreakdown,
        includeInflation: false,
        includePension: false,
        retirementLumpSumAtFire: 0,
        withdrawalRate: 0,
        maxMonths: 200,
        dependentBirthDate: "2013-02-20",
        independenceAge: 24,
      };

      const result = performFireSimulation(params, { recordMonthly: true, forceFireMonth: 0 });
      // 2025-05 (m0) to 2037-03 (m142) -> 143 months
      // 2037-04 (m143)
      expect(result.monthlyData[142].expenses).toBe(140000);
      expect(result.monthlyData[143].expenses).toBe(120000);
      vi.useRealTimers();
    });


    it("applies staged default reduction for 3 children after each independence", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-05-14T09:00:00+09:00"));

      const result = performFireSimulation({
        initialAssets: 100000000,
        riskAssets: 0,
        monthlyExpense: 200000,
        currentAge: 45,
        includeInflation: false,
        includePension: false,
        retirementLumpSumAtFire: 0,
        withdrawalRate: 0,
        maxMonths: 220,
        householdType: "family",
        dependentBirthDates: ["2013-02-20", "2015-05-10", "2018-10-01"],
        independenceAge: 24,
      }, { recordMonthly: true, forceFireMonth: 0 });

      expect(result.monthlyData[142].expenses).toBe(200000);
      expect(result.monthlyData[143].expenses).toBe(180000);
      expect(result.monthlyData[170].expenses).toBe(160000);
      expect(result.monthlyData[211].expenses).toBe(130000);
      vi.useRealTimers();
    });
    it("handles extreme negative flow with current assets", () => {
       const result = generateGrowthTable({
         ...params,
         initialAssets: 100,
         riskAssets: 100,
         monthlyIncome: 0,
         monthlyExpense: 1000000,
         includeTax: true,
         taxRate: 0.2
       });
       expect(result.table[1].assets).toBe(0);
    });

    it("uses monthlyExpenses if monthlyExpense is missing", () => {
      const result = generateAnnualSimulation({
        ...params,
        monthlyExpense: undefined,
        monthlyExpenses: 2400000, // 200k/month
        monthlyIncome: 300000,
        initialAssets: 1000, retirementLumpSumAtFire: 0,
      });
      expect(result[0].expenses).toBe(200000 * 12);
    });

    it("defaults monthlyExp to 0 if both are missing", () => {
      const result = generateAnnualSimulation({
        ...params,
        monthlyExpense: undefined,
        monthlyExpenses: undefined,
        monthlyIncome: 300000,
        initialAssets: 1000, retirementLumpSumAtFire: 0,
      });
      expect(result[0].expenses).toBe(0);
    });

    it("caps investment in growth table by available cash", () => {
      const result = generateGrowthTable({
        initialAssets: 1000, retirementLumpSumAtFire: 0,
        riskAssets: 0,
        monthlyIncome: 0,
        monthlyExpense: 0,
        monthlyInvestment: 5000, // Exceeds 1000
        annualReturnRate: 0,
        maxMonths: 1
      });
      // Month 0: assets 1000.
      // Month 1 transition: available 1000. investment capped at 1000.
      // Month 1: cash 0, risk 1000. Total assets 1000.
      expect(result.table[1].assets).toBe(1000);
    });

    it("handles initialAssets 0 in ratio calculation", () => {
        const result = generateGrowthTable({
            ...params,
            initialAssets: 0,
            riskAssets: 0
        });
        expect(result.table[0].assets).toBe(0);
    });

    it("drops mortgage payment after payoff month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-10T09:00:00+09:00"));

      const result = generateGrowthTable({
        initialAssets: 0,
        riskAssets: 0,
        monthlyInvestment: 0,
        monthlyIncome: 100000,
        annualReturnRate: 0,
        monthlyExpense: 90000,
        currentAge: 40,
        maxMonths: 2,
        mortgageMonthlyPayment: 50000,
        mortgagePayoffDate: "2026-02",
      });

      // m0: 2026-01 (Paid) -> income 100k, expense 90k -> assets 10k
      expect(result.table[1].assets).toBe(10000);
      // m1: 2026-02 (Paid - payoff month itself is paid) -> income 100k, expense 90k -> assets 20k
      expect(result.table[2].assets).toBe(20000);
      // m2 (if we had it): 2026-03 (Free) -> income 100k, expense 40k -> assets 80k

      vi.useRealTimers();
    });

    it("sets income to 0 after FIRE is reached", () => {
      const initialAssets = 500000000;
      const result = generateGrowthTable({
        initialAssets,
        riskAssets: 0,
        monthlyInvestment: 0,
        monthlyIncome: 500000,
        annualReturnRate: 0,
        monthlyExpense: 100000,
        currentAge: 40,
        maxMonths: 1,
        withdrawalRate: 0, retirementLumpSumAtFire: 0,
      });

      // FIRE reached at month 0, so month 1 should subtract expense only (income is forced to 0)
      expect(result.fireReachedMonth).toBe(0);
      expect(result.table[1].assets).toBe(initialAssets - 100000);
    });
  });

  describe("performFireSimulation", () => {
    it("runs simulation with forceFireMonth", () => {
      const params = { initialAssets: 1000000, retirementLumpSumAtFire: 0, monthlyExpense: 10000 };
      const res = performFireSimulation(params, { forceFireMonth: 12 });
      expect(res.fireReachedMonth).toBe(12);
    });

    it("uses returnsArray if provided", () => {
      const params = { initialAssets: 1000000, retirementLumpSumAtFire: 0, monthlyExpense: 10000, currentAge: 99 };
      const returns = new Array(12).fill(0.1);
      const res = performFireSimulation(params, { returnsArray: returns, recordMonthly: true });
      expect(res.monthlyData[0].investmentGain).toBeCloseTo(0, 0); // No risk assets initially
    });
  });

  describe("pension impact on simulation", () => {
    it("reduces requiredAssets when pension is near", () => {
      const params = {
        initialAssets: 10000000, retirementLumpSumAtFire: 0,
        riskAssets: 0,
        annualReturnRate: 0,
        monthlyExpense: 200000,
        currentAge: 59,
        maxMonths: 1,
        includePension: true,
      };
      const resultAt59 = generateGrowthTable(params);
      const resultAt40 = generateGrowthTable({ ...params, currentAge: 40 });

      // Required assets at age 59 should be much lower than at age 40 because pension starts in 1 year
      expect(resultAt59.table[0].requiredAssets).toBeLessThan(resultAt40.table[0].requiredAssets);
    });

    it("includes pension in post-FIRE cash flow", () => {
      // Start at age 60, already FIRE'd
      const initialAssets = 100000000;
      const monthlyExpense = 200000;
      const pension = calculateMonthlyPension(60, 60);

      const result = generateGrowthTable({
        initialAssets,
        riskAssets: 0,
        annualReturnRate: 0,
        monthlyExpense,
        currentAge: 60,
        maxMonths: 1,
        withdrawalRate: 0, retirementLumpSumAtFire: 0,
        includePension: true,
      });

      // assets at m1 = initial + pension - expense
      // 100,000,000 + 116,666 - 200,000 = 99,916,666
      expect(result.table[1].assets).toBe(initialAssets + pension - monthlyExpense);
    });

    it("verifies that pension income reduces withdrawal from assets efficiently (Bug 1)", () => {
      // If pension covers some expenses, we shouldn't sell extra risk assets.
      const initialAssets = 100000000;
      const monthlyExpense = 200000;
      const pension = calculateMonthlyPension(60, 60);

      const result = generateGrowthTable({
        initialAssets,
        riskAssets: initialAssets,
        annualReturnRate: 0,
        monthlyExpense,
        currentAge: 60,
        maxMonths: 1,
        withdrawalRate: 0, retirementLumpSumAtFire: 0,
        includePension: true,
      });

      const month1 = result.table[1];
      // Monthly withdrawal should be exactly the shortfall: Expense - Pension
      expect(initialAssets - month1.assets).toBe(monthlyExpense - pension);
    });

    it("verifies that 4% rule is correctly applied as a minimum withdrawal (Bug 2)", () => {
      // If 4% Assets > Expenses, we should withdraw 4% Assets.
      const initialAssets = 100000000; // 100M
      const monthlyExpense = 100000; // 1.2M/year
      const withdrawalRate = 0.04; // 4% rule -> 4M/year = 333,333/month

      const result = generateGrowthTable({
        initialAssets,
        riskAssets: initialAssets,
        annualReturnRate: 0,
        monthlyExpense,
        currentAge: 60,
        maxMonths: 1,
        withdrawalRate,
        includePension: false,
        retirementLumpSumAtFire: 0,
      });

      const month1 = result.table[1];
      // Total assets after 1 month should be:
      // start - expenses (we withdrew more but the excess stayed in cash)
      // 100,000,000 - 100,000 = 99,900,000
      expect(month1.assets).toBe(initialAssets - monthlyExpense);

      // But the "reported" withdrawal for that month should be 4% rule target
      const sim = generateAnnualSimulation({
        initialAssets,
        riskAssets: initialAssets,
        annualReturnRate: 0,
        monthlyExpense,
        currentAge: 60,
        withdrawalRate,
        includePension: false,
        retirementLumpSumAtFire: 0,
      });
      // Monthly ~333,333 * 12. Since assets decrease slightly each month,
      // the total will be slightly less than 4,000,000.
      expect(sim[0].withdrawal).toBeGreaterThan(3900000);
      expect(sim[0].withdrawal).toBeLessThan(4100000);
    });

    it("handles tax with pension enabled", () => {
      const result = generateGrowthTable({
        initialAssets: 10000000, retirementLumpSumAtFire: 0,
        riskAssets: 0,
        annualReturnRate: 0.05,
        monthlyExpense: 200000,
        currentAge: 50,
        maxMonths: 1,
        includePension: true,
        includeTax: true,
        taxRate: 0.2,
      });
      expect(result.table[0].requiredAssets).toBeGreaterThan(0);
    });
  });

  describe("generateAnnualSimulation", () => {
    const params = {
      initialAssets: 10000000, retirementLumpSumAtFire: 0,
      riskAssets: 5000000,
      annualReturnRate: 0.05,
      monthlyExpense: 200000,
      monthlyIncome: 300000,
      currentAge: 40,
    };

    it("generates annual data until age 100", () => {
      const result = generateAnnualSimulation(params);
      // From age 40 to 100 (inclusive) -> 40, 41, ..., 100 is 61 points
      expect(result.length).toBe(61);
      expect(result[0].age).toBe(40);
      expect(result[result.length - 1].age).toBe(100);
      expect(result[0].assets).toEqual(expect.any(Number));
      expect(result[0].assetsYearEnd).toEqual(expect.any(Number));
      expect(result[0]).toHaveProperty("fireMonthInYear");
    });

    it("marks FIRE month in annual row and keeps monthly/start-vs-end separation", () => {
      const result = generateAnnualSimulation({
        initialAssets: 120000000,
        riskAssets: 100000000,
        annualReturnRate: 0.05,
        monthlyExpense: 200000,
        monthlyIncome: 300000,
        currentAge: 50,
        retirementLumpSumAtFire: 5000000,
      });

      const fireYear = result.find((row) => row.fireMonthInYear !== null);
      expect(fireYear).toBeTruthy();
      expect(fireYear.fireMonthInYear % 12).toBeGreaterThanOrEqual(0);
      expect(fireYear.assetsYearEnd).not.toBe(fireYear.assets);
    });

    it("caps investment by available cash and keeps cashAssets non-negative", () => {
      const result = generateAnnualSimulation({
        initialAssets: 1000000, retirementLumpSumAtFire: 0,
        riskAssets: 0,
        monthlyIncome: 100000,
        monthlyExpense: 100000,
        monthlyInvestment: 500000, // Exceeds monthly surplus (0), so it should draw from 1M initial cash
        annualReturnRate: 0,
        currentAge: 40
      });

      expect(result[0].cashAssets).toBeGreaterThanOrEqual(0);
      expect(result[0].riskAssets).toBeLessThanOrEqual(1000000); // capped at initial + available
    });

    it("aggregates monthly income and expenses into annual values", () => {
      const result = generateAnnualSimulation({
        ...params,
        annualReturnRate: 0,
        includeInflation: false,
      });
      expect(result[0].income).toBe(3600000);
      expect(result[0].expenses).toBe(2400000);
    });

    it("handles pension and transition to FIRE", () => {
      const result = generateAnnualSimulation({
        ...params,
        initialAssets: 100000000, retirementLumpSumAtFire: 0, // already FIRE
        includePension: true,
        currentAge: 59,
      });
      expect(result[0].age).toBe(59);
      expect(result[0].income).toBe(0);
      expect(result[0].pension).toBe(0);

      expect(result[1].age).toBe(60);
      expect(result[1].pension).toBeGreaterThan(1000000);
    });

    it("calculates withdrawal amount when expenses > income", () => {
      const result = generateAnnualSimulation({
        ...params,
        initialAssets: 10000000, retirementLumpSumAtFire: 0,
        riskAssets: 10000000,
        monthlyIncome: 100000,
        monthlyExpense: 200000,
        annualReturnRate: 0,
      });
      expect(result[0].withdrawal).toBe(1200000);
    });

    it("tracks risk assets separately without forced rebalancing", () => {
      const result = generateAnnualSimulation({
        ...params,
        initialAssets: 10000000, retirementLumpSumAtFire: 0,
        riskAssets: 8000000, // 80%
        annualReturnRate: 0,
      });
      const year1 = result[1];
      expect(year1.riskAssets).toBe(8000000);
      expect(year1.assets).toBe(11200000);
      expect(year1.riskAssets / year1.assets).toBeCloseTo(0.714, 2);
    });

    it("calculates investment gain and handles monthly investment", () => {
      const result = generateAnnualSimulation({
        ...params,
        initialAssets: 10000000, retirementLumpSumAtFire: 0,
        riskAssets: 5000000,
        annualReturnRate: 0.1, // 10%
        monthlyInvestment: 100000, // 1.2M / year
        monthlyIncome: 300000,
        monthlyExpense: 200000,
      });

      const year0 = result[0];
      const year1 = result[1];
      expect(year0.investmentGain).toBeGreaterThan(500000);
      expect(year1.riskAssets).toBeGreaterThan(5000000 + 1200000);
      expect(year1.cashAssets).toBe(5000000);
    });

    it("handles mid-year mortgage payoff", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-10T09:00:00+09:00"));

      const result = generateAnnualSimulation({
        ...params,
        currentAge: 40,
        mortgageMonthlyPayment: 100000,
        mortgagePayoffDate: "2026-07",
        monthlyExpense: 200000,
      });

      expect(result[0].expenses).toBe(1900000);

      vi.useRealTimers();
    });

    it("handles tax on withdrawal (tax on gain portion)", () => {
      const result = generateAnnualSimulation({
        ...params,
        initialAssets: 10000000, retirementLumpSumAtFire: 0,
        riskAssets: 10000000,
        monthlyIncome: 0,
        monthlyExpense: 100000,
        includeTax: true,
        taxRate: 0.2,
        annualReturnRate: 0.05,
      });
      expect(result[0].withdrawal).toBe(1205317);
    });

    it("handles tax on withdrawal when post-FIRE (tax on gain portion)", () => {
      const result = generateAnnualSimulation({
        ...params,
        initialAssets: 100000000, retirementLumpSumAtFire: 0,
        riskAssets: 100000000,
        monthlyIncome: 0,
        monthlyExpense: 100000,
        includeTax: true,
        taxRate: 0.2,
        withdrawalRate: 0, retirementLumpSumAtFire: 0,
        annualReturnRate: 0.05,
      });
      expect(result[0].withdrawal).toBe(1205317);
    });

    it("handles inflation", () => {
      const result = generateAnnualSimulation({
        ...params,
        includeInflation: true,
        inflationRate: 0.1,
      });
      expect(result[1].expenses).toBeGreaterThan(result[0].expenses);
    });

    it("sets assets to 0 if they go negative", () => {
      const result = generateAnnualSimulation({
        ...params,
        initialAssets: 1000, retirementLumpSumAtFire: 0,
        monthlyIncome: 0,
        monthlyExpense: 1000000,
      });
      expect(result[1].assets).toBe(0);
    });

    it("handles surplus during FIRE (no investment)", () => {
      const result = generateAnnualSimulation({
        ...params,
        initialAssets: 1000000000, retirementLumpSumAtFire: 0,
        riskAssets: 900000000,
        monthlyIncome: 1000000,
        monthlyExpense: 100000,
        monthlyInvestment: 500000,
        currentAge: 70,
        withdrawalRate: 0, retirementLumpSumAtFire: 0,
        includePension: true,
        includeTax: false,
        includeInflation: false,
      });
      const year0 = result[0];
      expect(year0.savings).toBeGreaterThan(0);
    });
  });
});
