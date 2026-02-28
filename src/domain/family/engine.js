// Default values for backward compatibility or initial state
export const DEFAULT_USER_BIRTH_DATE = "1980-07-07";
export const DEFAULT_SPOUSE_BIRTH_DATE = "1982-08-08";
export const DEFAULT_DEPENDENT_BIRTH_DATE = "2012-09-09";

/**
 * Calculate age based on birth date string and a base date.
 * @param {string} birthDateStr - ISO date string (YYYY-MM-DD)
 * @param {Date} [baseDate=new Date()] - Date to calculate age at
 * @returns {number}
 */
export function calculateAge(birthDateStr, baseDate = new Date()) {
  if (!birthDateStr) return 0;
  if (!(baseDate instanceof Date) || Number.isNaN(baseDate.getTime())) return 0;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDateStr).trim());
  if (!match) return 0;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year
    || birthDate.getMonth() !== month - 1
    || birthDate.getDate() !== day
  ) {
    return 0;
  }

  let age = baseDate.getFullYear() - year;
  const m = baseDate.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && baseDate.getDate() < day)) {
    age--;
  }
  return Math.max(0, age);
}
