import { describe, expect, it } from "vitest";
import { calculateAge } from "./family";

describe("family domain", () => {
  it("calculates age correctly", () => {
    // 1979-09-02 born. On 2024-09-01, should be 44. On 2024-09-02, should be 45.
    const birthDate = "1979-09-02";
    expect(calculateAge(birthDate, new Date("2024-09-01"))).toBe(44);
    expect(calculateAge(birthDate, new Date("2024-09-02"))).toBe(45);
    expect(calculateAge(birthDate, new Date("2024-01-01"))).toBe(44);
    expect(calculateAge(birthDate, new Date("2025-01-01"))).toBe(45);
  });

  it("returns 0 for missing or invalid birth date", () => {
    expect(calculateAge("", new Date("2024-01-01"))).toBe(0);
    expect(calculateAge("not-a-date", new Date("2024-01-01"))).toBe(0);
  });

  it("decrements age when birthday has not occurred in the current month", () => {
    expect(calculateAge("2000-07-20", new Date("2024-07-01"))).toBe(23);
  });
});
