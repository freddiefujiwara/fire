import { describe, expect, it, vi } from "vitest";
import LZString from "lz-string";
import { decode, encode } from "./fire/url";

describe("fire url helpers", () => {
  it("encodes and decodes state", () => {
    const value = { a: 1, nested: { b: "text" } };
    const encoded = encode(value);
    expect(encoded).not.toBe("");
    expect(decode(encoded)).toEqual(value);
  });

  it("returns safe defaults for empty values", () => {
    expect(encode(null)).toBe("");
    expect(decode("")).toBeNull();
  });

  it("normalizes query-safe variants before decoding", () => {
    const value = { message: "hello world" };
    const encoded = encode(value);
    const withSpaces = encoded.replace(/_/g, " ");
    const withPercent20 = encoded.replace(/_/g, "%20");

    expect(decode(withSpaces)).toEqual(value);
    expect(decode(withPercent20)).toEqual(value);
  });

  it("returns null when decompressed payload is invalid", () => {
    expect(decode("invalid-data")).toBeNull();
  });

  it("returns null and logs when JSON parse fails", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const invalidJsonEncoded = LZString.compressToEncodedURIComponent("plain-text");
    expect(decode(invalidJsonEncoded)).toBeNull();
    expect(consoleSpy).toHaveBeenCalledOnce();
    consoleSpy.mockRestore();
  });
});

