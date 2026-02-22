export const DEFAULT_PENSION_CONFIG = {
  userStartAge: 65,
  spouseUserAgeStart: 65,
  basicFullAnnualYen: 780000,
  basicReduction: 0.9,
  earlyReduction: 0.76,
  pensionDataAge: 44,
  userKoseiAccruedAtDataAgeAnnualYen: 1000000,
  userKoseiFutureFactorAnnualYenPerYear: 42000,
  includeSpouse: true,
};

/**
 * Calculate monthly pension amount for one user age.
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

  if (age >= userStartAge) {
    const basicPart = basicFullAnnualYen * basicReduction * earlyReduction;
    const participationEndAge = Math.min(60, fireAge);
    const futureYears = Math.max(0, participationEndAge - pensionDataAge);
    const employeesPartAt65 = userKoseiAccruedAtDataAgeAnnualYen + futureYears * userKoseiFutureFactorAnnualYenPerYear;

    totalAnnual += basicPart + employeesPartAt65 * earlyReduction;
  }

  if (includeSpouse && age >= spouseUserAgeStart) {
    totalAnnual += basicFullAnnualYen;
  }

  return Math.round(totalAnnual / 12);
}
