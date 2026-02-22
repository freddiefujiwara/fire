import { describe, expect, it } from "vitest";
import * as familyDomain from "./family";
import { assetAmountYen, detectAssetOwner, ownerFromText, calculateAge } from "./family";

describe("family domain", () => {
  it("keeps expected exported functions on the family barrel", () => {
    expect(familyDomain).toMatchObject({
      DEFAULT_USER_BIRTH_DATE: expect.any(String),
      DEFAULT_SPOUSE_BIRTH_DATE: expect.any(String),
      DEFAULT_DEPENDENT_BIRTH_DATE: expect.any(String),
      calculateAge: expect.any(Function),
      ownerFromText: expect.any(Function),
      detectAssetOwner: expect.any(Function),
      assetAmountYen: expect.any(Function),
    });
  });

  it("calculates age correctly", () => {
    // 1979-09-02 born. On 2024-09-01, should be 44. On 2024-09-02, should be 45.
    const birthDate = "1979-09-02";
    expect(calculateAge(birthDate, new Date("2024-09-01"))).toBe(44);
    expect(calculateAge(birthDate, new Date("2024-09-02"))).toBe(45);
    expect(calculateAge(birthDate, new Date("2024-01-01"))).toBe(44);
    expect(calculateAge(birthDate, new Date("2025-01-01"))).toBe(45);
  });

  it("detects owner suffix", () => {
    expect(detectAssetOwner({ 名称: "A@chipop" }).id).toBe("wife");
    expect(detectAssetOwner({ 名称: "B@aojiru.pudding" }).id).toBe("daughter");
    expect(detectAssetOwner({ 名称: "C@freddie" }).id).toBe("me");
  });

  it("extracts amount fields", () => {
    expect(assetAmountYen({ 残高: "1,234" })).toBe(1234);
    expect(assetAmountYen({ 評価額: "500000" })).toBe(500000);
  });

  it("handles null or non-object in detectAssetOwner", () => {
    expect(detectAssetOwner(null).id).toBe("me");
    expect(detectAssetOwner("not an object").id).toBe("me");
  });

  it("handles null or non-object in assetAmountYen", () => {
    expect(assetAmountYen(null)).toBe(0);
    expect(assetAmountYen(undefined)).toBe(0);
  });

  it("returns zero if no amount field found in assetAmountYen", () => {
    expect(assetAmountYen({ no_amount: "100" })).toBe(0);
  });

  it("handles null text in ownerFromText", () => {
    expect(ownerFromText(null).id).toBe("me");
    expect(ownerFromText(undefined).id).toBe("me");
  });
});
