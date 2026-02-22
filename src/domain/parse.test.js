import { describe, expect, it } from "vitest";
import { toNumber, toPercent } from "./parse";

describe("parse helpers", () => {
  it("toNumber supports currency notation", () => {
    expect(toNumber("￥ 12,345")).toBe(12345);
    expect(toNumber("-1,200円")).toBe(-1200);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(123.45)).toBe(123.45);
    expect(toNumber(NaN)).toBe(0);
    expect(toNumber(Infinity)).toBe(0);
    expect(toNumber("..")).toBe(0);
    expect(toNumber("(1,200円)")).toBe(-1200);
    expect(toNumber("▲1,200")).toBe(-1200);
    expect(toNumber("△1,200")).toBe(-1200);
    expect(toNumber(undefined)).toBe(0);
  });

  it("toPercent supports both raw and percent strings", () => {
    expect(toPercent("9.94")).toBe(9.94);
    expect(toPercent("9.94%")).toBe(9.94);
    expect(toPercent("oops")).toBe(0);
    expect(toPercent(12.3)).toBe(12.3);
    expect(toPercent(NaN)).toBe(0);
    expect(toPercent(null)).toBe(0);
    expect(toPercent("(9.94%)")).toBe(-9.94);
    expect(toPercent("▲9.94%")).toBe(-9.94);
    expect(toPercent("△9.94%")).toBe(-9.94);
  });
});
