import { getCategoryLabel, getExpenseType } from "./classifiers";
import { getMonthKey } from "./shared";

export function getKPIs(cashFlow) {
  let income = 0;
  let expense = 0;
  let transfers = 0;

  cashFlow.forEach((item) => {
    if (item.isTransfer) {
      transfers += item.amount;
    } else {
      if (item.amount > 0) {
        income += item.amount;
      } else {
        expense += item.amount;
      }
    }
  });

  return {
    income,
    expense,
    net: income + expense,
    transfers,
  };
}

export function aggregateByMonth(cashFlow, { includeNet = true } = {}) {
  const months = {};
  cashFlow.forEach((item) => {
    if (item.isTransfer) {
      return;
    }
    const month = getMonthKey(item);
    if (!month) {
      return;
    }
    if (!months[month]) {
      months[month] = {
        month,
        income: 0,
        expense: 0,
        net: 0,
        fixed: 0,
        variable: 0,
        exclude: 0,
      };
    }
    if (item.amount > 0) {
      months[month].income += item.amount;
    } else {
      const absAmount = Math.abs(item.amount);
      months[month].expense += absAmount;

      const type = getExpenseType(item);
      if (type === "fixed") {
        months[month].fixed += absAmount;
      } else if (type === "variable") {
        months[month].variable += absAmount;
      } else if (type === "exclude") {
        months[month].exclude += absAmount;
      }
    }
    if (includeNet) {
      months[month].net += item.amount;
    }
  });

  return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
}

export function getRecentAverages(monthlyData, months = 6) {
  if (!monthlyData.length) {
    return {
      income: 0,
      expense: 0,
      net: 0,
      fixed: 0,
      variable: 0,
      exclude: 0,
      count: 0,
    };
  }

  const recent = monthlyData.slice(-months);
  const totals = recent.reduce(
    (acc, item) => ({
      income: acc.income + item.income,
      expense: acc.expense + item.expense,
      net: acc.net + item.net,
      fixed: acc.fixed + (item.fixed || 0),
      variable: acc.variable + (item.variable || 0),
      exclude: acc.exclude + (item.exclude || 0),
    }),
    {
      income: 0,
      expense: 0,
      net: 0,
      fixed: 0,
      variable: 0,
      exclude: 0,
    },
  );

  const count = recent.length;
  return {
    income: totals.income / count,
    expense: totals.expense / count,
    net: totals.net / count,
    fixed: totals.fixed / count,
    variable: totals.variable / count,
    exclude: totals.exclude / count,
    count,
  };
}

function getTargetRowsForAverage(cashFlow, averageMonths, excludeCurrentMonth) {
  if (averageMonths <= 0) {
    return cashFlow;
  }

  const expenseRows = cashFlow.filter((item) => item.amount < 0 && !item.isTransfer);
  const now = new Date();

  // Pick exactly the last N months from now to match fire.js logic
  const targetMonths = [];
  const startOffset = excludeCurrentMonth ? 1 : 0;
  for (let i = startOffset; i < startOffset + averageMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    targetMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const monthSet = new Set(targetMonths);
  return expenseRows.filter((item) => monthSet.has(getMonthKey(item)));
}

export function aggregateByCategory(cashFlow, { averageMonths = 0, excludeCurrentMonth = false } = {}) {
  const targetCashFlow = getTargetRowsForAverage(cashFlow, averageMonths, excludeCurrentMonth);

  const categories = {};
  targetCashFlow.forEach((item) => {
    if (item.isTransfer || item.amount >= 0) {
      return;
    }
    const categoryLabel = getCategoryLabel(item);
    if (!categories[categoryLabel]) {
      categories[categoryLabel] = { label: categoryLabel, value: 0 };
    }
    categories[categoryLabel].value += Math.abs(item.amount);
  });
  const items = Object.values(categories);
  if (averageMonths > 0) {
    items.forEach((item) => {
      item.value /= averageMonths;
    });
  }

  return items.sort((a, b) => b.value - a.value);
}

export function aggregateByType(cashFlow, { averageMonths = 0, excludeCurrentMonth = false } = {}) {
  const targetCashFlow = getTargetRowsForAverage(cashFlow, averageMonths, excludeCurrentMonth);

  const types = {
    fixed: { label: "固定費", value: 0, color: "#38bdf8" },
    variable: { label: "変動費", value: 0, color: "#f59e0b" },
    exclude: { label: "除外", value: 0, color: "#4b5563" },
  };

  targetCashFlow.forEach((item) => {
    if (item.isTransfer || item.amount >= 0) {
      return;
    }
    const type = getExpenseType(item);
    if (types[type]) {
      types[type].value += Math.abs(item.amount);
    }
  });

  if (averageMonths > 0) {
    Object.values(types).forEach((t) => {
      t.value /= averageMonths;
    });
  }

  return Object.values(types).filter((t) => t.value > 0);
}
