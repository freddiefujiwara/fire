import { describe, expect, it } from "vitest";
import { compressToEncodedURIComponent } from "@/lib/lzString";

describe("compressToEncodedURIComponent", () => {
  it("returns empty string for nullish input", () => {
    expect(compressToEncodedURIComponent(null)).toBe("");
    expect(compressToEncodedURIComponent(undefined)).toBe("");
  });

  it("keeps deterministic output for representative strings", () => {
    expect(compressToEncodedURIComponent("")).toBe("Q");
    expect(compressToEncodedURIComponent("hello")).toBe("BYUwNmD2Q");
    expect(compressToEncodedURIComponent("こんにちは")).toBe("soMmSGTWDIhgyPYMQ");
    expect(compressToEncodedURIComponent("株式投資123")).toBe("lQWnh9SpRo4zEIwEwMxA");
    expect(compressToEncodedURIComponent("aaaaabbbbbccccc")).toBe("IYkIwiGMZo");
  });

  it("outputs only URI-safe alphabet used by the module", () => {
    const out = compressToEncodedURIComponent("BalanceSheet:株式+投信+年金");
    expect(out).toMatch(/^[A-Za-z0-9+\-$]+$/);
  });
});
