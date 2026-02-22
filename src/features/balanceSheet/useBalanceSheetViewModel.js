import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { compressToEncodedURIComponent } from "@/lib/lzString";
import { toNumber } from "@/domain/parse";
import { balanceSheetLayout } from "@/domain/dashboard";
import { signedClass } from "@/domain/signed";
import { usePortfolioData } from "@/composables/usePortfolioData";
import { filterHoldingsByOwner, OWNER_FILTERS, summarizeByCategory } from "@/domain/assetOwners";
import { assetAmountYen } from "@/domain/family";
import {
  EMPTY_HOLDINGS,
  HOLDING_TABLE_CONFIGS,
  riskAssetSummary,
  stockTiles as buildStockTiles,
  fundTiles as buildFundTiles,
  pensionTiles as buildPensionTiles,
  allRiskTiles,
  getYahooSymbol,
} from "@/domain/holdings";
import { useInitialHashRestore } from "@/composables/useInitialHashRestore";

const KEY_MAP = {
  breakdown: "asset_breakdown",
  "breakdown-liability": "liability_breakdown",
  "total-liability": "total_liability",
  details__portfolio_det_depo__t0: "cash_and_deposit_details",
  details__portfolio_det_eq__t0: "stock_details",
  details__portfolio_det_mf__t0: "investment_trust_details",
  details__portfolio_det_pns__t0: "pension_details",
  details__portfolio_det_po__t0: "point_details",
  "details__liability_det__t0-liability": "liability_details",
};

/**
 * Manage data and actions for the Balance Sheet page.
 */
export function useBalanceSheetViewModel() {
  const route = useRoute();
  const router = useRouter();
  const { data, loading, error, rawResponse } = usePortfolioData();

  const selectedOwner = computed(() => {
    const ownerFromQuery = String(route.query.owner ?? "all").toLowerCase();
    return OWNER_FILTERS.some((owner) => owner.id === ownerFromQuery) ? ownerFromQuery : "all";
  });

  /**
   * Update owner query in URL.
   */
  const selectOwner = (ownerId) => {
    router.replace({ query: { ...route.query, owner: ownerId } });
  };

  const filteredHoldings = computed(() => filterHoldingsByOwner(data.value?.holdings, selectedOwner.value) || EMPTY_HOLDINGS);
  const categoryCards = computed(() => summarizeByCategory(filteredHoldings.value));
  /**
   * Get amount for one card key.
   */
  const getCategoryAmount = (key) => categoryCards.value.find((c) => c.key === key)?.amountYen || 0;

  const assetsByClass = computed(() => {
    const assets = categoryCards.value.filter((c) => !c.isLiability);
    const total = assets.reduce((sum, c) => sum + c.amountYen, 0);
    return assets.map((c) => ({
      name: c.title,
      amountYen: c.amountYen,
      percentage: total > 0 ? Number(((c.amountYen / total) * 100).toFixed(1)) : 0,
    }));
  });

  const liabilitiesByCategory = computed(() => {
    const details = filteredHoldings.value.liabilitiesDetail || [];
    const groups = { "住宅ローン": 0, "クレジットカード利用残高": 0, "その他負債": 0 };
    details.forEach((row) => {
      const type = String(row?.["種類"] || "");
      const amount = toNumber(row?.["残高"]);
      if (type.includes("住宅ローン")) groups["住宅ローン"] += amount;
      else if (type.includes("クレジットカード")) groups["クレジットカード利用残高"] += amount;
      else groups["その他負債"] += amount;
    });

    const total = Object.values(groups).reduce((sum, v) => sum + v, 0);
    return Object.entries(groups)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount]) => ({
        category,
        amountYen: amount,
        percentage: total > 0 ? Number(((amount / total) * 100).toFixed(1)) : 0,
      }));
  });

  const totals = computed(() => {
    const assetsYen = assetsByClass.value.reduce((sum, c) => sum + c.amountYen, 0);
    const liabilitiesYen = liabilitiesByCategory.value.reduce((sum, c) => sum + c.amountYen, 0);
    return { assetsYen, liabilitiesYen, netWorthYen: assetsYen - liabilitiesYen };
  });

  const totalRiskAssetsYen = computed(() => {
    const riskKeys = ["stocks", "funds", "pensions"];
    return categoryCards.value.filter((c) => riskKeys.includes(c.key)).reduce((sum, c) => sum + c.amountYen, 0);
  });

  const balanceLayout = computed(() => balanceSheetLayout(totals.value));

  const enrichedHoldings = computed(() => {
    const h = filteredHoldings.value;
    const totalAssets = totals.value.assetsYen;
    const totalRisk = totalRiskAssetsYen.value;

    const result = { ...h };
    ["stocks", "funds", "pensions"].forEach((key) => {
      if (result[key]) {
        result[key] = result[key].map((row) => {
          const amount = assetAmountYen(row);
          return {
            ...row,
            __riskAssetRatio: totalRisk > 0 ? ((amount / totalRisk) * 100).toFixed(1) : "0.0",
            __totalAssetRatio: totalAssets > 0 ? ((amount / totalAssets) * 100).toFixed(1) : "0.0",
          };
        });
      }
    });
    return result;
  });

  const summary = computed(() => riskAssetSummary(filteredHoldings.value));
  const riskAssetsTotal = computed(() => summary.value.totalYen);
  const dailyMoves = computed(() => summary.value.dailyMoves);
  const dailyMoveTotal = computed(() => summary.value.dailyMoveTotal);
  const dailyMoveClass = computed(() => signedClass(dailyMoveTotal.value));
  const totalProfitYen = computed(() => summary.value.totalProfitYen);
  const totalProfitClass = computed(() => signedClass(totalProfitYen.value));
  const totalProfitRatePct = computed(() => summary.value.totalProfitRatePct);

  const stockTiles = computed(() => buildStockTiles(filteredHoldings.value?.stocks || []));
  const fundTiles = computed(() => buildFundTiles(filteredHoldings.value?.funds || []));
  const pensionTiles = computed(() => buildPensionTiles(filteredHoldings.value?.pensions || []));
  const totalRiskTiles = computed(() => allRiskTiles(filteredHoldings.value));

  const stockTreemapUrl = computed(() => {
    const stocks = (enrichedHoldings.value?.stocks || [])
      .map((row) => {
        const rawCode = String(row?.["銘柄コード"] || "").trim();
        const symbol = getYahooSymbol(rawCode) || rawCode;
        const quantity = toNumber(row?.["保有数"] ?? row?.["数量"]);
        if (!symbol || quantity <= 0) return null;
        return { symbol, quantity };
      })
      .filter(Boolean);

    if (!stocks.length) return "";
    const encoded = compressToEncodedURIComponent(JSON.stringify(stocks)).replace(/\+/g, "_");
    return `https://freddiefujiwara.com/portfolio-treemap/${encoded}`;
  });

  /**
   * Build mapped raw asset JSON for copy.
   */
  const getMappedAssetStatusJson = () => {
    if (!rawResponse.value || typeof rawResponse.value !== "object") return "{}";
    const root = rawResponse.value;
    const target = root?.data && typeof root.data === "object" ? root.data : root;
    if (!target || typeof target !== "object") return "{}";

    const { mfcf, ...others } = target;
    const mappedOthers = {};
    Object.keys(others).forEach((key) => {
      const newKey = KEY_MAP[key] || key;
      mappedOthers[newKey] = others[key];
    });

    return JSON.stringify(mappedOthers, null, 2);
  };

  useInitialHashRestore({ route, router, loading, isReady: computed(() => Boolean(data.value)) });

  const configs = HOLDING_TABLE_CONFIGS;
  const assetPie = computed(() => assetsByClass.value.map((item) => ({ label: item.name, value: item.amountYen })));
  const liabilityPie = computed(() => liabilitiesByCategory.value.map((item) => ({ label: item.category, value: item.amountYen })));

  /**
   * Read auth token for copy button.
   */
  const copyToken = () => {
    const token = localStorage.getItem("asset-google-id-token");
    if (!token) {
      window.alert("トークンが localStorage に見つかりません。");
      throw new Error("Token not found");
    }
    return token;
  };

  return {
    loading,
    error,
    OWNER_FILTERS,
    selectedOwner,
    selectOwner,
    categoryCards,
    riskAssetsTotal,
    dailyMoves,
    dailyMoveTotal,
    dailyMoveClass,
    totalProfitYen,
    totalProfitClass,
    totalProfitRatePct,
    balanceLayout,
    totals,
    assetPie,
    liabilityPie,
    totalRiskTiles,
    configs,
    stockTiles,
    fundTiles,
    pensionTiles,
    getCategoryAmount,
    enrichedHoldings,
    stockTreemapUrl,
    getMappedAssetStatusJson,
    copyToken,
  };
}
