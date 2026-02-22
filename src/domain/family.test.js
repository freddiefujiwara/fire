import { describe, expect, it } from "vitest";
import * as familyDomain from "./family";
import { assetAmountYen, detectAssetOwner, summarizeFamilyAssets, assetDisplayName, ownerFromText, calculateAge } from "./family";

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
      assetDisplayName: expect.any(Function),
      summarizeFamilyAssets: expect.any(Function),
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

  it("summarizes holdings and daily moves by owner", () => {
    const groups = summarizeFamilyAssets({
      cashLike: [{ 種類・名称: "普通預金@chipop", 残高: "100" }],
      stocks: [{ 銘柄名: "ETF@aojiru.pudding", 評価額: "200", 前日比: "20", 評価損益: "50", 評価損益率: "33.3" }],
      funds: [{ 銘柄名: "All Country", 評価額: "300", 前日比: "-10", 評価損益: "30", 評価損益率: "11.1" }],
      pensions: [],
      points: [],
    });

    expect(groups.find((g) => g.ownerLabel === "妻")?.totalYen).toBe(100);
    expect(groups.find((g) => g.ownerLabel === "娘")?.dailyMoveYen).toBe(20);
    expect(groups.find((g) => g.ownerLabel === "私")?.dailyMoveYen).toBe(-10);
    expect(groups.find((g) => g.ownerLabel === "娘")?.profitYen).toBe(50);
    expect(groups.find((g) => g.ownerLabel === "私")?.profitRatePct).toBeCloseTo(11.111, 3);
    expect(groups.find((g) => g.ownerLabel === "娘")?.items[0]?.profitRatePct).toBe(33.3);
  });

  it("returns null group profit rate when principal is zero", () => {
    const groups = summarizeFamilyAssets({
      cashLike: [],
      stocks: [{ 銘柄名: "HighRisk", 評価額: "100", 評価損益: "100", 評価損益率: "999" }],
      funds: [],
      pensions: [],
      points: [],
    });

    expect(groups.find((g) => g.ownerLabel === "私")?.profitRatePct).toBeNull();
  });

  it("treats missing holdings object safely", () => {
    const groups = summarizeFamilyAssets();

    expect(groups).toHaveLength(3);
    expect(groups.every((group) => group.totalYen === 0)).toBe(true);
    expect(groups.every((group) => group.profitRatePct === 0)).toBe(true);
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

  it("falls through all fields in assetDisplayName", () => {
    expect(assetDisplayName({})).toBe("-");
    expect(assetDisplayName({ "種類": "TypeA" })).toBe("TypeA");
    expect(assetDisplayName({ "名称": "NameB" })).toBe("NameB");
    expect(assetDisplayName({ "銘柄名": "StockC" })).toBe("StockC");
    expect(assetDisplayName({ "種類・名称": "CategoryD" })).toBe("CategoryD");
    expect(assetDisplayName({ "名称・説明": "FullE" })).toBe("FullE");
  });

});
