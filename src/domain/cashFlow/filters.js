import { getCategoryLabel, getCategoryParts, getExpenseType } from "./classifiers";
import { UNCATEGORIZED } from "./constants";

export function filterCashFlow(
  cashFlow,
  { month, category, largeCategory, smallCategory, includeTransfers, search, type } = {},
) {
  const normalizedSearch = search?.toLowerCase();

  return cashFlow.filter((item) => {
    const categoryLabel = getCategoryLabel(item);

    if (month && !item.date?.startsWith(month)) {
      return false;
    }

    if (type && getExpenseType(item) !== type) {
      return false;
    }

    // Backward compatibility or exact match
    if (category && categoryLabel !== category) {
      return false;
    }

    // New large/small category filter
    if (largeCategory) {
      const { large, small } = getCategoryParts(item);
      if (large !== largeCategory) {
        return false;
      }
      if (smallCategory && small !== smallCategory) {
        return false;
      }
    }

    if (includeTransfers === false && item.isTransfer) {
      return false;
    }

    if (normalizedSearch) {
      const name = (item.name || "").toLowerCase();
      const searchableCategory = categoryLabel.toLowerCase();
      if (!name.includes(normalizedSearch) && !searchableCategory.includes(normalizedSearch)) {
        return false;
      }
    }

    return true;
  });
}

export function sortCashFlow(cashFlow, sortKey, sortOrder = "asc") {
  if (!sortKey) return cashFlow;

  return [...cashFlow].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === "category") {
      valA = valA || UNCATEGORIZED;
      valB = valB || UNCATEGORIZED;
    }

    const comparison = Number(valA > valB) - Number(valA < valB);
    return sortOrder === "asc" ? comparison : -comparison;
  });
}
