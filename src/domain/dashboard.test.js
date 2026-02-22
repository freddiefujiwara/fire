import { describe, expect, it } from "vitest";
import { balanceSheetLayout } from "./dashboard";

describe("balanceSheetLayout", () => {
  it("builds left-assets / right-split proportions", () => {
    const layout = balanceSheetLayout({ assetsYen: 600, liabilitiesYen: 200, netWorthYen: 400 });

    expect(layout.assetsWidthPct).toBeCloseTo(50, 5);
    expect(layout.rightWidthPct).toBeCloseTo(50, 5);
    expect(layout.liabilitiesHeightPct).toBeCloseTo(33.3333, 3);
    expect(layout.netWorthHeightPct).toBeCloseTo(66.6667, 3);
  });

  it("falls back safely for empty totals", () => {
    const layout = balanceSheetLayout({ assetsYen: 0, liabilitiesYen: 0, netWorthYen: 0 });
    expect(layout.assetsWidthPct).toBeCloseTo(33.34, 2);
    expect(layout.liabilitiesHeightPct).toBe(50);
  });

  it("clamps percentages to 20-80 range when values are non-zero but relatively small", () => {
    // Assets are small (10%) but should be clamped to 20%
    // Liabilities are small (1%) but should be clamped to 20%
    const layout = balanceSheetLayout({
      assetsYen: 100,
      liabilitiesYen: 10,
      netWorthYen: 990,
    });

    // Total = 100 + (10 + 990) = 1100
    // assetsWidthPct = 100 / 1100 = 9.09% -> clamped to 20%
    expect(layout.assetsWidthPct).toBe(20);
    expect(layout.rightWidthPct).toBe(80);

    // rightTotal = 10 + 990 = 1000
    // liabilitiesHeightPct = 10 / 1000 = 1% -> clamped to 20%
    expect(layout.liabilitiesHeightPct).toBe(20);
    expect(layout.netWorthHeightPct).toBe(80);
  });

  it("does not clamp to 20% if value is exactly zero", () => {
    const layout = balanceSheetLayout({
      assetsYen: 1000,
      liabilitiesYen: 0,
      netWorthYen: 1000,
    });

    expect(layout.assetsWidthPct).toBe(50);
    expect(layout.liabilitiesHeightPct).toBe(0);
    expect(layout.netWorthHeightPct).toBe(100);
  });

  it("handles case where rightTotal is zero but total is positive", () => {
    const layout = balanceSheetLayout({
      assetsYen: 1000,
      liabilitiesYen: 0,
      netWorthYen: 0,
    });

    expect(layout.assetsWidthPct).toBe(100);
    expect(layout.liabilitiesHeightPct).toBe(50);
  });
});
