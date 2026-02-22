import { toNumber } from "./parse";

export function balanceSheetLayout(totals) {
  const assetsYen = Math.max(0, toNumber(totals?.assetsYen));
  const liabilitiesYen = Math.max(0, toNumber(totals?.liabilitiesYen));
  const netWorthYen = Math.max(0, toNumber(totals?.netWorthYen));

  const rightTotal = liabilitiesYen + netWorthYen;
  const total = assetsYen + rightTotal;

  if (total <= 0) {
    return {
      assetsYen,
      liabilitiesYen,
      netWorthYen,
      assetsWidthPct: 33.34,
      rightWidthPct: 66.66,
      liabilitiesHeightPct: 50,
      netWorthHeightPct: 50,
    };
  }

  let assetsWidthPct = (assetsYen / total) * 100;
  if (assetsYen > 0 && rightTotal > 0) {
    assetsWidthPct = Math.max(20, Math.min(80, assetsWidthPct));
  }
  const rightWidthPct = 100 - assetsWidthPct;

  let liabilitiesHeightPct = rightTotal > 0 ? (liabilitiesYen / rightTotal) * 100 : 50;
  if (liabilitiesYen > 0 && netWorthYen > 0) {
    liabilitiesHeightPct = Math.max(20, Math.min(80, liabilitiesHeightPct));
  }
  const netWorthHeightPct = 100 - liabilitiesHeightPct;

  return {
    assetsYen,
    liabilitiesYen,
    netWorthYen,
    assetsWidthPct,
    rightWidthPct,
    liabilitiesHeightPct,
    netWorthHeightPct,
  };
}
