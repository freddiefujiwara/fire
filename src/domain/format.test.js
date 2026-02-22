import { describe, expect, it } from "vitest";
import { dailyChangeYen, formatSignedYen, formatYen, holdingRowKey, truncate } from "./format";

describe("format helpers", () => {
  it("formats yen values", () => {
    expect(formatYen("1,234")).toBe("¥1,234");
    expect(formatYen(null)).toBe("¥0");
  });

  it("formats signed yen values", () => {
    expect(formatSignedYen(1000)).toBe("+¥1,000");
    expect(formatSignedYen(-1000)).toBe("-¥1,000");
    expect(formatSignedYen(0)).toBe("±¥0");
  });

  it("extracts daily change from known keys", () => {
    expect(dailyChangeYen({ 前日比: "100" })).toBe(100);
    expect(dailyChangeYen({ 前日からの値動き: "-20" })).toBe(-20);
    expect(dailyChangeYen({ 前日損益: "30" })).toBe(30);
    expect(dailyChangeYen({ 前日比損益: "40" })).toBe(40);
    expect(dailyChangeYen({ 評価損益: "50" })).toBe(50);
    expect(dailyChangeYen({ 当日損益: "60" })).toBe(60);
  });

  it("returns null when row is invalid or no daily change key exists", () => {
    expect(dailyChangeYen(null)).toBeNull();
    expect(dailyChangeYen("oops")).toBeNull();
    expect(dailyChangeYen({ 銘柄名: "AAA" })).toBeNull();
  });

  it("creates stable row keys from best available fields", () => {
    expect(holdingRowKey({ 保有金融機関: "Bank", 名称・説明: "Loan" })).toBe("Bank__Loan");
    expect(holdingRowKey({ 保有金融機関: "Bank", 種類・名称: "Cash" })).toBe("Bank__Cash");
    expect(holdingRowKey({ 保有金融機関: "Bank", 銘柄名: "ETF" })).toBe("Bank__ETF");
    expect(holdingRowKey({ 保有金融機関: "Bank", 名称: "Point" })).toBe("Bank__Point");
    expect(holdingRowKey({})).toBe("__");
  });

  it("truncates long strings", () => {
    expect(truncate("12345678901", 10)).toBe("1234567890...");
    expect(truncate("1234567890", 10)).toBe("1234567890");
    expect(truncate("short", 10)).toBe("short");
    expect(truncate(null, 10)).toBe(null);
    const longString = "a".repeat(26);
    expect(truncate(longString)).toBe("a".repeat(25) + "..."); // default length 25
  });
});
