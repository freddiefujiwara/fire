import { describe, it, expect } from "vitest";
import { performFireSimulation, generateGrowthTable, generateAnnualSimulation } from "./engine";

describe("FIRE Engine - Accounting Identity and Consistency", () => {
  const baseParams = {
    initialAssets: 10000000,
    riskAssets: 5000000,
    annualReturnRate: 0.05,
    monthlyExpense: 200000,
    monthlyIncome: 400000,
    currentAge: 40,
    includeInflation: true,
    inflationRate: 0.02,
    includeTax: true,
    taxRate: 0.2,
    withdrawalRate: 0.04,
    withdrawalMode: "max",
    simulationEndAge: 100,
    retirementLumpSumAtFire: 5000000,
    includePension: true,
    pensionConfig: {
      userStartAge: 65,
      spouseUserAgeStart: 65,
      basicFullAnnualYen: 780000,
      basicReduction: 1.0,
      pensionDataAge: 40,
      userKoseiAccruedAtDataAgeAnnualYen: 1000000,
      userKoseiFutureFactorAnnualYenPerYear: 20000,
      includeSpouse: false,
    }
  };

  it("should maintain the accounting identity: Delta Assets = Income + Pension + LumpSum - Expenses + InvestmentGain - Taxes", () => {
    // Force FIRE at age 45 (month 60)
    const annualData = generateAnnualSimulation(baseParams, { forceFireMonth: 60 });

    // Check every consecutive year pair
    for (let i = 0; i < annualData.length - 1; i++) {
      if (annualData[i + 1].assets <= 0) break; // Identity doesn't hold once bankrupt due to Math.max(0, assets)
      const currentYear = annualData[i];
      const nextYear = annualData[i + 1];

      const deltaAssets = nextYear.assets - currentYear.assets;
      const expectedDelta =
        currentYear.income +
        currentYear.pension +
        currentYear.lumpSum -
        currentYear.expenses +
        currentYear.investmentGain -
        currentYear.taxes;

      // Allow for rounding errors since annual values are rounded
      expect(Math.abs(deltaAssets - expectedDelta)).toBeLessThanOrEqual(12); // Max 1 yen per month rounding
    }
  });

  it("should correctly record retirement lump sum in the FIRE year", () => {
    const fireMonth = 60; // 5 years later
    const annualData = generateAnnualSimulation(baseParams, { forceFireMonth: fireMonth });

    const fireYearIndex = Math.floor(fireMonth / 12);
    const fireYear = annualData[fireYearIndex];

    expect(fireYear.lumpSum).toBe(baseParams.retirementLumpSumAtFire);

    // Non-FIRE years should have zero lump sum
    annualData.forEach((year, index) => {
      if (index !== fireYearIndex) {
        expect(year.lumpSum).toBe(0);
      }
    });
  });

  it("should not have partial data for the final year (Age 100)", () => {
    const simulationEndAge = 100;
    const currentAge = 40;
    const annualData = generateAnnualSimulation({ ...baseParams, simulationEndAge, currentAge });

    const lastYear = annualData[annualData.length - 1];
    expect(lastYear.age).toBe(simulationEndAge - 1);

    // If it were a partial year, income/expenses would be much lower than typical
    expect(lastYear.expenses).toBeGreaterThan(1000000);
  });
});

describe("FIRE Engine - Withdrawal Modes", () => {
  const baseParams = {
    initialAssets: 100000000, // 100M yen
    riskAssets: 100000000,
    annualReturnRate: 0.05,
    monthlyExpense: 300000, // 300k per month = 3.6M per year
    monthlyIncome: 0,
    currentAge: 40,
    includeInflation: false,
    includeTax: false,
    withdrawalRate: 0.04, // 4M per year if using assets * rate
    simulationEndAge: 100,
    includePension: false,
    retirementLumpSumAtFire: 0,
  };

  it("should withdraw more in 'max' mode when target withdrawal (4%) exceeds expenses", () => {
    // Expense = 3.6M, 4% of 100M = 4M.
    // In 'max' mode, it should take 4M.
    const resMax = performFireSimulation({ ...baseParams, withdrawalMode: "max" }, { forceFireMonth: 0, recordMonthly: true });

    // Month 0 withdrawal should be around 4M / 12 = 333,333
    const firstMonthWithdrawal = resMax.monthlyData[0].withdrawal;
    expect(firstMonthWithdrawal).toBeCloseTo(4000000 / 12, 0);

    // Month 1's starting cash should reflect Month 0's (withdrawal - expense)
    // cash = 0 + (0 income + 333,333 withdrawal - 300,000 expense) = 33,333
    expect(resMax.monthlyData[1].cashAssets).toBeGreaterThan(0);
  });

  it("should withdraw less in 'min' mode when expenses are less than target withdrawal (4%)", () => {
    // Expense = 3.6M, 4% of 100M = 4M.
    // In 'min' mode, it should take min(3.6M, 4M) = 3.6M.
    const resMin = performFireSimulation({ ...baseParams, withdrawalMode: "min" }, { forceFireMonth: 0, recordMonthly: true });

    const firstMonthWithdrawal = resMin.monthlyData[0].withdrawal;
    expect(firstMonthWithdrawal).toBeCloseTo(3600000 / 12, 0);

    // In 'min' mode, Month 1's starting cash should be 0 because withdrawal (3.6M) == expenses (3.6M)
    expect(resMin.monthlyData[1].cashAssets).toBeCloseTo(0, 0);
  });

  it("should cap withdrawal in 'min' mode when expenses exceed target withdrawal", () => {
    // Expense = 500k/mo = 6M/yr, 4% of 100M = 4M.
    // In 'min' mode, it should take min(6M, 4M) = 4M.
    const resMin = performFireSimulation({ ...baseParams, monthlyExpense: 500000, withdrawalMode: "min" }, { forceFireMonth: 0, recordMonthly: true });

    const firstMonthWithdrawal = resMin.monthlyData[0].withdrawal;
    expect(firstMonthWithdrawal).toBeCloseTo(4000000 / 12, 0);

    // Month 1's starting cash should be negative because withdrawal (333,333) < expenses (500,000)
    expect(resMin.monthlyData[1].cashAssets).toBeLessThan(0);
  });

  it("should calculate correct required assets", () => {
    const res = generateGrowthTable({ ...baseParams, withdrawalMode: "min" });
    // Required assets should be calculated for all months
    expect(res.table[0].requiredAssets).toBeGreaterThan(0);
  });
});
