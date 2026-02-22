import { computed, getCurrentInstance, onMounted, ref, watch } from "vue";
import { useUiStore } from "@/stores/ui";

const THEME_STORAGE_KEY = "asset-theme";

/**
 * Manage app shell state for theme and privacy.
 */
export function useAppShellViewModel() {
  const theme = ref("dark");
  const uiStore = useUiStore();

  const isDark = computed(() => theme.value === "dark");
  const themeLabel = computed(() => (isDark.value ? "ライト" : "ダーク"));
  const privacyLabel = computed(() => (uiStore.privacyMode ? "金額表示" : "金額モザイク"));

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

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      theme.value = savedTheme;
    }

    applyTheme(theme.value);
    document.documentElement.setAttribute("data-private", uiStore.privacyMode ? "on" : "off");
  };

  if (getCurrentInstance()) {
    onMounted(initializeTheme);
  } else {
    initializeTheme();
  }

  watch(theme, (nextTheme) => {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });

  return {
    themeLabel,
    privacyLabel,
    togglePrivacy,
    toggleTheme,
  };
}
