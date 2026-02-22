import { describe, expect, it } from "vitest";
import {
  EMPTY_SUMMARY,
  buildAnnualTableJson,
  buildConditionsAndAlgorithmJson,
  createMortgageOptions,
  fireDate,
  formatMonths,
} from "@/features/fireSimulator/formatters";
import { DEFAULT_PENSION_CONFIG } from "@/domain/fire";

describe("fireSimulator formatters", () => {
  it("provides an empty summary shape", () => {
    expect(EMPTY_SUMMARY.monthCount).toBe(0);
    expect(EMPTY_SUMMARY.monthlyLivingExpenses.breakdown).toEqual([]);
  });

  it("creates mortgage options from base date", () => {
    const options = createMortgageOptions(new Date("2025-01-01"), 2);
    expect(options).toEqual([
      { val: "2025-01", label: "2025年1月" },
      { val: "2025-02", label: "2025年2月" },
      { val: "2025-03", label: "2025年3月" },
    ]);
  });

  it("formats fire date and month text", () => {
    expect(fireDate(14, new Date("2025-01-01"))).toBe("2026年3月");
    expect(fireDate(1200, new Date("2025-01-01"))).toBe("未達成 (100年以上)");
    expect(formatMonths(6)).toBe("6ヶ月");
    expect(formatMonths(25)).toBe("2年1ヶ月");
    expect(formatMonths(-1)).toBe("100年以上");
  });

  it("builds export payloads", () => {
    const full = buildConditionsAndAlgorithmJson({
      conditions: { a: 1, pensionConfig: DEFAULT_PENSION_CONFIG },
      monteCarloResults: { successRate: 0.87, p10: 1, p50: 2, p90: 3, trials: 1000 },
      monteCarloVolatility: 20,
      monteCarloSeed: 99,
      estimatedMonthlyPensionAt60: 100,
      pensionAnnualAtFire: 200,
      fireAchievementAge: 50,
      algorithmExplanation: "detail",
    });
    expect(full.conditions.a).toBe(1);
    expect(full.monteCarlo.successRatePercent).toBe("87.0");
    expect(full.pensionEstimates.userMonthlyAtAge60Yen).toBeGreaterThan(0);

    const withoutMonteCarlo = buildConditionsAndAlgorithmJson({
      conditions: { pensionConfig: DEFAULT_PENSION_CONFIG },
      monteCarloResults: null,
      monteCarloVolatility: 0,
      monteCarloSeed: 0,
      estimatedMonthlyPensionAt60: 0,
      pensionAnnualAtFire: 0,
      fireAchievementAge: 60,
      algorithmExplanation: "",
    });
    expect(withoutMonteCarlo.monteCarlo).toBeNull();

    expect(
      buildAnnualTableJson([
        { age: 40, income: 10, pension: 2, expenses: 5, investmentGain: 1, withdrawal: 0, assets: 100, cashAssets: 30, riskAssets: 70 },
      ]),
    ).toEqual([
      {
        age: 40,
        incomeWithPensionYen: 12,
        expensesYen: 5,
        investmentGainYen: 1,
        withdrawalYen: 0,
        totalAssetsYen: 100,
        savingsCashYen: 30,
        riskAssetsYen: 70,
      },
    ]);
  });
});
