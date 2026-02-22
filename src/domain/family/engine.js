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
