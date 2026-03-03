import { describe, it, expect, vi } from "vitest";
import {
  createMortgageOptions,
  fireDate,
  formatMonths,
  buildConditionsAndAlgorithmJson,
  buildAnnualTableJson,
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
        currentAge: 40,
        simulationEndAge: 100,
        pensionConfig: {
          basicFullAnnualYen: 816000,
          spouseUserAgeStart: 62,
          includeSpouse: true,
        },
        useMonteCarlo: true,
        monteCarloTrials: 1000,
        monteCarloVolatilityPercent: 18,
        monteCarloSeed: 42,
        targetFireSuccessRatePercent: 80,
      },
      monteCarloResults: {
        successRate: 0.51,
        p10: 1,
        p50: 2,
        p90: 3,
        trials: 1000,
        terminalDepletionPlan: {
          recommendedFireMonth: 192,
          p50TerminalAssets: -849071,
          successRate: 0.499,
          boundaryHit: null,
        },
      },
      estimatedMonthlyPensionAtStartAge: 100,
      pensionAnnualAtFire: 1200,
      pensionEstimateAge: 62,
      algorithmExplanation: "keep-this",
    });

    expect(result.simulationInputs.portfolioAndCashflow.mortgageMonthlyPaymentYen).toBe(10);
    expect(result.simulationInputs.householdProfile.spouseBirthDate).toBe("1992-02-02");
    expect(result.keyResults.fireTarget.fireAchievementAge).toBe(45);
    expect(result.monteCarloSimulation.results.terminalAssetsPercentilesYen.p50Yen).toBe(2);
    expect(result.monteCarloSimulation.results.terminalDepletionGuide).toEqual({
      simulationEndAge: 100,
      recommendedFireMonth: 192,
      recommendedFireAge: 56,
      p50TerminalAssetsYen: -849071,
      successRatePercent: 49.9,
      boundaryHit: null,
    });
    expect(result.keyResults.pensionEstimates.householdAnnualAtPensionEstimateAgeYen).toBe(1200);
    expect(result.keyResults.pensionEstimates.spouseBasicMonthlyEquivalentYen).toBe(68000);
    expect(result.keyResults.pensionEstimates.spouseBasicMonthlyAtPensionEstimateAgeYen).toBe(68000);
    expect(result.algorithmExplanation).toBe("keep-this");
  });

  it("buildAnnualTableJson prefers year-end balances when available", () => {
    const [row] = buildAnnualTableJson([{
      age: 55,
      income: 0,
      pension: 0,
      expenses: 8296971,
      investmentGain: 0,
      withdrawal: 1373707,
      assets: 50000000,
      assetsYearEnd: 48626293,
      cashAssets: 6923264,
      cashAssetsYearEnd: 0,
      riskAssets: 43076736,
      riskAssetsYearEnd: 48626293,
    }]);

    expect(row.totalAssetsYen).toBe(48626293);
    expect(row.savingsCashYen).toBe(0);
    expect(row.riskAssetsYen).toBe(48626293);
    expect(row.withdrawalNetYen).toBe(1373707);
    expect(row.withdrawalGrossYen).toBe(1373707);
    expect(row.withdrawalTaxesYen).toBe(0);
  });

  it("buildAnnualTableJson includes gross/net/tax breakdown for withdrawals", () => {
    const [row] = buildAnnualTableJson([{
      age: 56,
      income: 0,
      pension: 0,
      expenses: 8296971,
      investmentGain: 0,
      withdrawal: 8296971,
      withdrawalNet: 8296971,
      withdrawalGross: 8941901,
      taxes: 644930,
      assets: 0,
      cashAssets: 0,
      riskAssets: 0,
    }]);

    expect(row.withdrawalYen).toBe(8296971);
    expect(row.withdrawalNetYen).toBe(8296971);
    expect(row.withdrawalGrossYen).toBe(8941901);
    expect(row.withdrawalTaxesYen).toBe(644930);
  });
});
