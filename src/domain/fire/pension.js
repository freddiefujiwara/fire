export const DEFAULT_PENSION_CONFIG = {
  userStartAge: 65,
  spouseUserAgeStart: 65,
  basicFullAnnualYen: 780000,
  basicReduction: 0.9,
  earlyReduction: undefined,
  pensionDataAge: 44,
  userKoseiAccruedAtDataAgeAnnualYen: 1000000,
  userKoseiFutureFactorAnnualYenPerYear: 42000,
  includeSpouse: true,
};

/**
 * Calculate pension adjustment rate from the pension start age.
 * @param {number} userStartAge - User age when pension payments start.
 * @returns {number} Multiplier applied to the pension amount.
 */
export function calculateStartAgeAdjustmentRate(userStartAge) {
  const normalizedStartAge = Number(userStartAge);
  if (!Number.isFinite(normalizedStartAge)) return 1.0;

  if (normalizedStartAge === 65) return 1.0;

  if (normalizedStartAge < 65) {
    const monthsEarly = Math.max(0, Math.round((65 - normalizedStartAge) * 12));
    return Math.max(0, 1.0 - monthsEarly * 0.004);
  }

  const cappedStartAge = Math.min(normalizedStartAge, 75);
  const monthsDelayed = Math.max(0, Math.round((cappedStartAge - 65) * 12));
  return 1.0 + monthsDelayed * 0.007;
}

/**
 * Calculate the total monthly pension amount for one age point in the simulation.
 * @param {number} age - Current age to evaluate.
 * @param {number} fireAge - Age when work income ends.
 * @param {object} [config=DEFAULT_PENSION_CONFIG] - Pension settings used in the calculation.
 * @returns {number} Monthly pension amount rounded to yen.
 */
export function calculateMonthlyPension(age, fireAge, config = DEFAULT_PENSION_CONFIG) {
  let totalAnnual = 0;

  const {
    userStartAge,
    spouseUserAgeStart,
    basicFullAnnualYen,
    basicReduction,
    earlyReduction,
    pensionDataAge,
    userKoseiAccruedAtDataAgeAnnualYen,
    userKoseiFutureFactorAnnualYenPerYear,
    includeSpouse,
  } = config;

  const startAgeAdjustmentRate = earlyReduction ?? calculateStartAgeAdjustmentRate(userStartAge);

  if (age >= userStartAge) {
    const basicPart = basicFullAnnualYen * basicReduction * startAgeAdjustmentRate;
    const participationEndAge = Math.min(60, fireAge);
    const futureYears = Math.max(0, participationEndAge - pensionDataAge);
    const employeesPartAt65 = userKoseiAccruedAtDataAgeAnnualYen + futureYears * userKoseiFutureFactorAnnualYenPerYear;

    totalAnnual += basicPart + employeesPartAt65 * startAgeAdjustmentRate;
  }

  if (includeSpouse && age >= spouseUserAgeStart) {
    totalAnnual += basicFullAnnualYen;
  }

  return Math.round(totalAnnual / 12);
}
