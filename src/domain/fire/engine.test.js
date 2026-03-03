import { describe, it, expect } from "vitest";
import { performFireSimulation, generateGrowthTable } from "./engine";

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
