import { describe, it, expect, vi } from "vitest";
import {
  createMortgageOptions,
  fireDate,
  formatMonths,
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
});
