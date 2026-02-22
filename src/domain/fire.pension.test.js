import { describe, it, expect } from "vitest";
import * as fireDomain from "./fire";
import { calculateMonthlyPension } from "./fire";

describe("fire domain", () => {
  const legacyConfig = {
    userStartAge: 60,
    spouseUserAgeStart: 62,
    basicFullAnnualYen: 780000,
    basicReduction: 0.9,
    earlyReduction: 0.76,
    pensionDataAge: 44,
    userKoseiAccruedAtDataAgeAnnualYen: 892252,
    userKoseiFutureFactorAnnualYenPerYear: 42000,
    includeSpouse: true,
  };

  describe("calculateMonthlyPension", () => {
    it("returns 0 before age 60", () => {
      expect(calculateMonthlyPension(59.9, 50, legacyConfig)).toBe(0);
    });

    it("returns approx 116,929 (1.4M / 12) at age 60 if FIRE at 50", () => {
      // User Basic (60): 780k * 0.9 * 0.76 = 533,520
      // User Kosei (65): 892,252 (accrued at 44) + (50 - 44) * 42,000 = 892,252 + 252,000 = 1,144,252
      // User Kosei (60): 1,144,252 * 0.76 = 869,632
      // Total (60): 533,520 + 869,632 = 1,403,152
      // Monthly: 1,403,152 / 12 = 116,929
      expect(calculateMonthlyPension(60, 50, legacyConfig)).toBe(116929);
    });

    it("adds spouse pension (approx 65,000) at user age 62", () => {
      // User part: 116,929
      // Spouse part: 780,000 / 12 = 65,000
      // Total: 116,929 + 65,000 = 181,929
      expect(calculateMonthlyPension(62, 50, legacyConfig)).toBe(181929);
    });

    it("adjusts user pension based on FIRE age", () => {
      // FIRE at 40 (Participation stops before age 44 data point)
      // User Basic (60): 533,520
      // User Kosei (65): 892,252 (capped at accrued amount so far)
      // User Kosei (60): 892,252 * 0.76 = 678,112
      // Total (60): 533,520 + 678,112 = 1,211,632
      // Monthly: 1,211,632 / 12 = 100,969
      expect(calculateMonthlyPension(60, 40, legacyConfig)).toBe(100969);
    });

    it("caps participation at age 60", () => {
      // FIRE at 65, but participation for pension calculation caps at 60
      expect(calculateMonthlyPension(60, 65, legacyConfig)).toBe(calculateMonthlyPension(60, 60, legacyConfig));
    });
  });


});
