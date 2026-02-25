import { describe, it, expect } from "vitest";
import { performFireSimulation, runMonteCarloSimulation, findWithdrawalRateForMedianDepletion, findFireMonthForMedianDepletion } from "./fire";

describe("Monte Carlo Simulation", () => {
  const baseParams = {
    initialAssets: 10000000,
    riskAssets: 5000000,
    annualReturnRate: 0.05,
    monthlyExpense: 200000,
    monthlyIncome: 300000,
    currentAge: 40,
    withdrawalRate: 0.04,
    retirementLumpSumAtFire: 5000000,
  };

  it("produces different results for P10, P50, and P90 when risk assets > 0", () => {
    const result = runMonteCarloSimulation(baseParams, {
      trials: 100,
      annualVolatility: 0.2,
      seed: 42
    });

    expect(result.p10).toBeLessThan(result.p50);
    expect(result.p50).toBeLessThan(result.p90);
    expect(result.p10Path[result.p10Path.length - 1]).toBeLessThan(result.p90Path[result.p90Path.length - 1]);
  });

  it("produces identical results for P10, P50, and P90 when risk assets = 0", () => {
    const paramsNoRisk = { ...baseParams, riskAssets: 0 };
    const result = runMonteCarloSimulation(paramsNoRisk, {
      trials: 10,
      annualVolatility: 0.2,
      seed: 42
    });

    expect(result.p10).toBe(result.p50);
    expect(result.p50).toBe(result.p90);
  });

  it("is reproducible with the same seed", () => {
    const result1 = runMonteCarloSimulation(baseParams, {
      trials: 50,
      annualVolatility: 0.15,
      seed: 123
    });
    const result2 = runMonteCarloSimulation(baseParams, {
      trials: 50,
      annualVolatility: 0.15,
      seed: 123
    });

    expect(result1.p50).toBe(result2.p50);
    expect(result1.successRate).toBe(result2.successRate);
  });

  it("produces different results with different seeds", () => {
    const result1 = runMonteCarloSimulation(baseParams, {
      trials: 50,
      annualVolatility: 0.15,
      seed: 123
    });
    const result2 = runMonteCarloSimulation(baseParams, {
      trials: 50,
      annualVolatility: 0.15,
      seed: 456
    });

    expect(result1.p50).not.toBe(result2.p50);
  });

  it("matches deterministic final assets when volatility is 0%", () => {
    const deterministic = performFireSimulation(baseParams);
    const monteCarlo = runMonteCarloSimulation(baseParams, {
      trials: 50,
      annualVolatility: 0,
      seed: 42,
    });

    expect(monteCarlo.p10).toBeCloseTo(deterministic.finalAssets, 8);
    expect(monteCarlo.p50).toBeCloseTo(deterministic.finalAssets, 8);
    expect(monteCarlo.p90).toBeCloseTo(deterministic.finalAssets, 8);
  });

  it("uses the same FIRE timing as deterministic simulation", () => {
    const deterministic = performFireSimulation(baseParams);
    const monteCarlo = runMonteCarloSimulation(baseParams, {
      trials: 30,
      annualVolatility: 0.12,
      seed: 123,
    });

    expect(monteCarlo.fireReachedMonth).toBe(deterministic.fireReachedMonth);
  });

  it("accepts forceFireMonth and uses it for Monte Carlo runs", () => {
    const forcedMonth = 24;
    const monteCarlo = runMonteCarloSimulation(baseParams, {
      trials: 30,
      annualVolatility: 0.12,
      seed: 123,
      forceFireMonth: forcedMonth,
    });

    expect(monteCarlo.fireReachedMonth).toBe(forcedMonth);
  });

  it("sanitizes invalid trial count to a minimum of 1", () => {
    const result = runMonteCarloSimulation(baseParams, {
      trials: 0,
      annualVolatility: 0.1,
      seed: 7,
    });

    expect(result.trials).toBe(1);
    expect(Number.isFinite(result.successRate)).toBe(true);
  });

  it("clamps negative volatility to 0", () => {
    const deterministic = performFireSimulation(baseParams);
    const result = runMonteCarloSimulation(baseParams, {
      trials: 20,
      annualVolatility: -0.5,
      seed: 7,
    });

    expect(result.p50).toBeCloseTo(deterministic.finalAssets, 8);
  });

  it("covers interpolation and maxMonths limits", () => {
    const params = {
      initialAssets: 1000000,
      riskAssets: 500000,
      monthlyExpense: 100000,
      currentAge: 99,
      maxMonths: 6, // Small maxMonths to trigger line 1017
    };
    // trials=101 to trigger lowerIndex === upperIndex at P50
    const res = runMonteCarloSimulation(params, { trials: 101, annualVolatility: 0.1 });
    expect(res.p50).toBeDefined();
  });

  it("handles non-finite volatility", () => {
    const res = runMonteCarloSimulation(baseParams, {
      trials: 10,
      annualVolatility: Infinity,
      seed: 42
    });
    // Should fallback to 0 volatility
    expect(res.p50).toBeDefined();
  });

  it("finds a withdrawal rate that moves median terminal assets toward zero", () => {
    const baseline = runMonteCarloSimulation(baseParams, {
      trials: 60,
      annualVolatility: 0.15,
      seed: 99,
    });

    const tuned = findWithdrawalRateForMedianDepletion(baseParams, {
      trials: 60,
      annualVolatility: 0.15,
      seed: 99,
      toleranceYen: 200000,
      minWithdrawalRate: 0.01,
      maxWithdrawalRate: 0.2,
    });

    expect(tuned.recommendedWithdrawalRate).toBeGreaterThanOrEqual(0.01);
    expect(tuned.recommendedWithdrawalRate).toBeLessThanOrEqual(0.2);
    expect(Math.abs(tuned.p50TerminalAssets)).toBeLessThanOrEqual(Math.abs(baseline.p50));
  });


  it("finds a FIRE timing that moves median terminal assets toward zero", () => {
    const baseline = runMonteCarloSimulation(baseParams, {
      trials: 60,
      annualVolatility: 0.15,
      seed: 99,
      forceFireMonth: 0,
    });

    const tuned = findFireMonthForMedianDepletion(baseParams, {
      trials: 60,
      annualVolatility: 0.15,
      seed: 99,
      toleranceYen: 200000,
    });

    expect(tuned.recommendedFireMonth).toBeGreaterThanOrEqual(0);
    expect(Math.abs(tuned.p50TerminalAssets)).toBeLessThanOrEqual(Math.abs(baseline.p50));
  });

  it("returns a boundary hint when earliest FIRE timing already leaves surplus median assets", () => {
    const conservative = findFireMonthForMedianDepletion({
      ...baseParams,
      initialAssets: 50000000,
      riskAssets: 20000000,
      monthlyExpense: 50000,
      monthlyIncome: 0,
      annualReturnRate: 0.08,
      retirementLumpSumAtFire: 10000000,
    }, {
      trials: 20,
      annualVolatility: 0,
      seed: 7,
      toleranceYen: 1,
    });

    expect(conservative.boundaryHit).toBe("low");
    expect(conservative.recommendedFireMonth).toBe(0);
  });

  it("returns a boundary hint when no tested withdrawal can deplete median assets", () => {
    const conservative = findWithdrawalRateForMedianDepletion({
      ...baseParams,
      monthlyExpense: 1,
      monthlyIncome: 0,
      annualReturnRate: 0.08,
    }, {
      trials: 20,
      annualVolatility: 0,
      seed: 7,
      minWithdrawalRate: 0,
      maxWithdrawalRate: 0.03,
      toleranceYen: 1,
    });

    expect(conservative.boundaryHit).toBe("high");
    expect(conservative.recommendedWithdrawalRate).toBeCloseTo(0.03, 6);
  });

});
