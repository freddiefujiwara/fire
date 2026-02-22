import { computed, nextTick, onMounted, ref, watch } from "vue";
import { usePortfolioStore } from "@/stores/portfolio";
import { useUiStore } from "@/stores/ui";

const THEME_STORAGE_KEY = "asset-theme";
const ID_TOKEN_STORAGE_KEY = "asset-google-id-token";

/**
 * Manage app shell state for auth, theme, and privacy.
 */
export function useAppShellViewModel() {
  const theme = ref("dark");
  const idToken = ref("");
  const googleReady = ref(false);
  const googleScriptError = ref(false);
  const googleButtonRoot = ref(null);

  const portfolioStore = usePortfolioStore();
  const uiStore = useUiStore();

  const isDark = computed(() => theme.value === "dark");
  const themeLabel = computed(() => (isDark.value ? "ライト" : "ダーク"));
  const privacyLabel = computed(() => (uiStore.privacyMode ? "金額表示" : "金額モザイク"));
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const hasGoogleClientId = computed(() => Boolean(googleClientId));
  const authError = computed(() => portfolioStore.error.startsWith("AUTH "));
  const hasData = computed(() => Boolean(portfolioStore.data));
  const initialLoading = computed(() => portfolioStore.loading && !hasData.value);
  const canUseApp = computed(() => hasData.value || Boolean(idToken.value));
  const showLoginGate = computed(() => !initialLoading.value && !idToken.value && (portfolioStore.source !== "live" || !hasData.value));

  /**
   * Apply theme to document root.
   */
  const applyTheme = (nextTheme) => {
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  /**
   * Toggle between dark and light theme.
   */
  const toggleTheme = () => {
    theme.value = isDark.value ? "light" : "dark";
  };

  /**
   * Toggle privacy mode in UI store.
   */
  const togglePrivacy = () => {
    uiStore.togglePrivacy();
  };

  /**
   * Read id token from local storage.
   */
  const readSavedToken = () => {
    idToken.value = localStorage.getItem(ID_TOKEN_STORAGE_KEY) || "";
  };

  /**
   * Clear portfolio state before refetch.
   */
  const clearPortfolioState = () => {
    portfolioStore.data = null;
    portfolioStore.error = "";
    portfolioStore.source = "";
  };

  /**
   * Log out and refresh data without token.
   */
  const logout = () => {
    localStorage.removeItem(ID_TOKEN_STORAGE_KEY);
    idToken.value = "";
    clearPortfolioState();
    portfolioStore.fetchPortfolio();
  };

  /**
   * Save Google credential and fetch live data.
   */
  const handleGoogleCredential = (response) => {
    const credential = response?.credential;
    if (!credential) return;
    idToken.value = credential;
    localStorage.setItem(ID_TOKEN_STORAGE_KEY, credential);
    portfolioStore.fetchPortfolio(credential);
  };

  /**
   * Render Google sign-in button.
   */
  const renderGoogleButton = () => {
    if (!googleReady.value || !googleButtonRoot.value) return;
    if (!googleClientId || !window.google?.accounts?.id) return;

    googleButtonRoot.value.innerHTML = "";
    window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCredential });
    window.google.accounts.id.renderButton(googleButtonRoot.value, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
    });
  };

  /**
   * Load Google login script once.
   */
  const loadGoogleScript = () => {
    if (window.google?.accounts?.id) {
      googleReady.value = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleReady.value = true;
    };
    script.onerror = () => {
      googleScriptError.value = true;
    };
    document.head.appendChild(script);
  };

  onMounted(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      theme.value = savedTheme;
    }

    readSavedToken();
    loadGoogleScript();

    if (!portfolioStore.data && !portfolioStore.error) {
      portfolioStore.fetchPortfolio();
    }

    applyTheme(theme.value);
    document.documentElement.setAttribute("data-private", uiStore.privacyMode ? "on" : "off");
  });

  watch(theme, (nextTheme) => {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });

  watch(
    () => portfolioStore.error,
    (newError) => {
      if (newError.startsWith("AUTH ") && idToken.value) {
        logout();
      }
    },
  );

  watch(
    () => [googleReady.value, showLoginGate.value],
    async () => {
      await nextTick();
      if (showLoginGate.value) renderGoogleButton();
    },
    { immediate: true },
  );

  return {
    portfolioStore,
    themeLabel,
    privacyLabel,
    hasGoogleClientId,
    authError,
    initialLoading,
    showLoginGate,
    googleScriptError,
    googleButtonRoot,
    idToken,
    togglePrivacy,
    toggleTheme,
    logout,
  };
}
