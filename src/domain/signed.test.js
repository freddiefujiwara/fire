import { describe, expect, it } from "vitest";
import { formatSignedPercent, signedClass, totalProfitRate } from "./signed";

describe("signed domain", () => {
  it("returns sign classes", () => {
    expect(signedClass(10)).toBe("is-positive");
    expect(signedClass(-1)).toBe("is-negative");
    expect(signedClass(0)).toBe("");
  });

  it("formats signed percent", () => {
    expect(formatSignedPercent(1.234)).toBe("+1.23%");
    expect(formatSignedPercent(-1.239, 1)).toBe("-1.2%");
    expect(formatSignedPercent(0)).toBe("±0.00%");
    expect(formatSignedPercent(null)).toBe("-");
  });

  it("calculates total profit rate with edge cases", () => {
    expect(totalProfitRate(0, 0)).toBe(0);
    expect(totalProfitRate(100, 100)).toBeNull();
    expect(totalProfitRate(110, 10)).toBeCloseTo(10);
  });
});
