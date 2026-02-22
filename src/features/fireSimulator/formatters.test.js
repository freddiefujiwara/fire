import { describe, it, expect, vi } from "vitest";
import {
  createMortgageOptions,
  fireDate,
  formatMonths,
  buildConditionsAndAlgorithmJson,
} from "./formatters";

describe("fireSimulator formatters", () => {
  it("creates mortgage options for a select dropdown", () => {
    const baseDate = new Date("2026-01-10");
    const options = createMortgageOptions(baseDate, 12);
    expect(options).toHaveLength(13); // 0 to 12 inclusive
    expect(options[0]).toEqual({ val: "2026-01", label: "2026年1月" });
    expect(options[12]).toEqual({ val: "2027-01", label: "2027年1月" });
  });

  it("calculates fireDate string correctly", () => {
    const baseDate = new Date("2026-01-10");
    expect(fireDate(0, baseDate)).toBe("2026年1月");
    expect(fireDate(13, baseDate)).toBe("2027年2月");
    expect(fireDate(1200, baseDate)).toBe("未達成 (100年以上)");
    expect(fireDate(-1, baseDate)).toBe("未達成 (100年以上)");
  });

  it("formats months into year/month display string", () => {
    expect(formatMonths(5)).toBe("5ヶ月");
    expect(formatMonths(12)).toBe("1年0ヶ月");
    expect(formatMonths(14)).toBe("1年2ヶ月");
    expect(formatMonths(1200)).toBe("100年以上");
    expect(formatMonths(-1)).toBe("100年以上");
  });


  it("builds reorganized conditions/algorithm payload while preserving algorithmExplanation", () => {
    const result = buildConditionsAndAlgorithmJson({
      conditions: {
        householdType: "single",
        totalFinancialAssetsYen: 1000,
        riskAssetsYen: 600,
        cashAssetsYen: 400,
        estimatedAnnualExpenseYen: 120,
        estimatedAnnualIncomeYen: 240,
        annualInvestmentYen: 50,
        annualSavingsYen: 70,
        annualBonusYen: 20,
        mortgageMonthlyPaymentYen: 10,
        mortgagePayoffDate: null,
        includeInflation: true,
        inflationRatePercent: 2,
        includeTax: true,
        taxRatePercent: 20,
        expectedAnnualReturnRatePercent: 5,
        withdrawalRatePercent: 4,
        postFireExtraExpenseMonthlyYen: 5,
        postFireFirstYearExtraExpenseYen: 10,
        retirementLumpSumAtFireYen: 0,
        userBirthDate: "1990-01-01",
        spouseBirthDate: "1992-02-02",
        dependentBirthDates: [],
        requiredAssetsAtFireYen: 3000,
        fireAchievementMonth: 100,
        fireAchievementAge: 45,
        pensionConfig: {
          basicFullAnnualYen: 816000,
          spouseUserAgeStart: 62,
          includeSpouse: true,
        },
      },
      monteCarloResults: { successRate: 0.51, p10: 1, p50: 2, p90: 3, trials: 1000 },
      monteCarloVolatility: 18,
      monteCarloSeed: 42,
      estimatedMonthlyPensionAt60: 100,
      pensionAnnualAtFire: 1200,
      pensionEstimateAge: 62,
      fireAchievementAge: 45,
      algorithmExplanation: "keep-this",
    });

    expect(result.simulationInputs.portfolioAndCashflow.mortgageMonthlyPaymentYen).toBe(10);
    expect(result.simulationInputs.householdProfile.spouseBirthDate).toBe("1992-02-02");
    expect(result.keyResults.fireTarget.fireAchievementAge).toBe(45);
    expect(result.monteCarloSimulation.terminalAssetsPercentilesYen.p50Yen).toBe(2);
    expect(result.keyResults.pensionEstimates.householdAnnualAtPensionEstimateAgeYen).toBe(1200);
    expect(result.keyResults.pensionEstimates.spouseBasicMonthlyEquivalentYen).toBe(68000);
    expect(result.keyResults.pensionEstimates.spouseBasicMonthlyAtPensionEstimateAgeYen).toBe(68000);
    expect(result.algorithmExplanation).toBe("keep-this");
  });
});
