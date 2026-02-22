import { toNumber } from "../parse";

const OWNER_RULES = [
  { id: "wife", label: "妻", suffix: "@chipop" },
  { id: "daughter", label: "娘", suffix: "@aojiru.pudding" },
];

const DEFAULT_OWNER = { id: "me", label: "私" };

// Default values for backward compatibility or initial state
export const DEFAULT_USER_BIRTH_DATE = "1979-09-02";
export const DEFAULT_SPOUSE_BIRTH_DATE = "1976-04-23";
export const DEFAULT_DEPENDENT_BIRTH_DATE = "2013-02-20";

/**
 * Calculate age based on birth date string and a base date.
 * @param {string} birthDateStr - ISO date string (YYYY-MM-DD)
 * @param {Date} [baseDate=new Date()] - Date to calculate age at
 * @returns {number}
 */
export function calculateAge(birthDateStr, baseDate = new Date()) {
  if (!birthDateStr) return 0;
  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return 0;

  let age = baseDate.getFullYear() - birthDate.getFullYear();
  const m = baseDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && baseDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

const ASSET_FIELD_CANDIDATES = ["残高", "評価額", "現在価値", "現在の価値", "amount_yen", "金額"];

export function ownerFromText(text) {
  const normalized = String(text ?? "").toLowerCase();
  const matched = OWNER_RULES.find((rule) => normalized.includes(rule.suffix));
  return matched ? { id: matched.id, label: matched.label } : DEFAULT_OWNER;
}

export function detectAssetOwner(row) {
  if (!row || typeof row !== "object") {
    return DEFAULT_OWNER;
  }

  const merged = Object.values(row)
    .filter((value) => typeof value === "string")
    .join(" ");

  return ownerFromText(merged);
}

export function assetAmountYen(row) {
  if (!row || typeof row !== "object") {
    return 0;
  }

  for (const key of ASSET_FIELD_CANDIDATES) {
    if (key in row) {
      return toNumber(row[key]);
    }
  }

  return 0;
}
