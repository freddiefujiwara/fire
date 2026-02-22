import { describe, expect, it } from "vitest";
import { formatYen } from "./format";

describe("format helpers", () => {
  it("formats yen values", () => {
    expect(formatYen("1,234")).toBe("¥1,234");
    expect(formatYen(null)).toBe("¥0");
  });
});
