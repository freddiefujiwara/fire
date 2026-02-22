import { describe, it, expect } from "vitest";
import * as cashFlowDomain from "./cashFlow";
import { getExpenseType } from "./cashFlow";

describe("cashFlow domain", () => {
  describe("public API safety net", () => {
    it("keeps expected exported functions on the cashFlow barrel", () => {
      expect(cashFlowDomain).toMatchObject({
        getExpenseType: expect.any(Function),
      });
    });
  });

  describe("getExpenseType", () => {
    it("classifies transfers as exclude", () => {
      expect(getExpenseType({ isTransfer: true })).toBe("exclude");
      expect(getExpenseType({ isTransfer: true, category: "住宅/ローン返済" })).toBe("exclude");
    });

    it("classifies special prefixes as exclude", () => {
      expect(getExpenseType("特別な支出/冠婚葬祭")).toBe("exclude");
      expect(getExpenseType("現金/引き出し")).toBe("exclude");
      expect(getExpenseType("カード/支払")).toBe("exclude");
    });

    it("handles objects without category", () => {
      expect(getExpenseType({ isTransfer: false })).toBe("variable");
    });

    it("handles null or empty input", () => {
      expect(getExpenseType(null)).toBe("variable");
      expect(getExpenseType("")).toBe("variable");
    });

    it("handles non-string categories safely", () => {
      expect(getExpenseType({ isTransfer: false, category: 1234 })).toBe("variable");
      expect(getExpenseType(1234)).toBe("variable");
    });

    it("classifies fixed expenses", () => {
      expect(getExpenseType("住宅/ローン返済")).toBe("fixed");
      expect(getExpenseType({ isTransfer: false, category: "住宅/ローン返済" })).toBe("fixed");
      expect(getExpenseType("住宅/管理費")).toBe("fixed");
      expect(getExpenseType("水道・光熱費")).toBe("fixed");
      expect(getExpenseType("教養・教育/学費")).toBe("fixed");
      expect(getExpenseType("保険/生命保険")).toBe("fixed");
      expect(getExpenseType("通信費/携帯電話")).toBe("fixed");
      expect(getExpenseType("健康・医療/病院")).toBe("fixed");
      expect(getExpenseType("食費/食費")).toBe("fixed");
      expect(getExpenseType("食費/食料品")).toBe("fixed");
      expect(getExpenseType("日用品/雑貨")).toBe("fixed");
      expect(getExpenseType("衣服・美容/美容院・理髪")).toBe("fixed");
    });

    it("classifies excluded expenses", () => {
      expect(getExpenseType("カード引き落とし")).toBe("exclude");
      expect(getExpenseType("ATM引き出し")).toBe("exclude");
      expect(getExpenseType("電子マネー")).toBe("exclude");
      expect(getExpenseType("使途不明金")).toBe("exclude");
      expect(getExpenseType("収入/給与")).toBe("exclude");
    });

    it("classifies everything else as variable", () => {
      expect(getExpenseType("食費/外食")).toBe("variable");
      expect(getExpenseType("趣味・娯楽")).toBe("variable");
      expect(getExpenseType("未分類")).toBe("variable");
    });
  });
});
