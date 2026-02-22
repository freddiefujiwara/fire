import { getCategoryLabel, getCategoryParts } from "./classifiers";
import { getMonthKey } from "./shared";

export function getUniqueMonths(cashFlow) {
  const months = new Set();
  cashFlow.forEach((item) => {
    const month = getMonthKey(item);
    if (month) {
      months.add(month);
    }
  });
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

export function getUniqueCategories(cashFlow) {
  const categories = new Set();
  cashFlow.forEach((item) => {
    categories.add(getCategoryLabel(item));
  });
  return Array.from(categories).sort();
}

export function getUniqueLargeCategories(cashFlow) {
  const categories = new Set();
  cashFlow.forEach((item) => {
    const { large } = getCategoryParts(item);
    categories.add(large);
  });
  return Array.from(categories).sort();
}

export function getUniqueSmallCategories(cashFlow, largeCategory) {
  if (!largeCategory) {
    return [];
  }
  const categories = new Set();
  cashFlow.forEach((item) => {
    const { large, small } = getCategoryParts(item);
    if (large === largeCategory && small) {
      categories.add(small);
    }
  });
  return Array.from(categories).sort();
}
