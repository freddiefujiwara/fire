import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { usePortfolioStore } from "@/stores/portfolio";

/**
 * Connect to portfolio store and fetch data on mount.
 */
export function usePortfolioData() {
  const store = usePortfolioStore();
  const { data, loading, error, source, rawResponse } = storeToRefs(store);

  onMounted(() => {
    if (!data.value && !loading.value && !error.value) {
      store.fetchPortfolio();
    }
  });

  return {
    store,
    data,
    loading,
    error,
    source,
    rawResponse,
  };
}
