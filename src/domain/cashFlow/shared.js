export function getMonthKey(item) {
  const month = item.date?.substring(0, 7) || "";
  return month.length === 7 ? month : "";
}
