import { defineStore } from "pinia";
import { ref, watch } from "vue";

const PRIVACY_STORAGE_KEY = "fire-privacy";

/**
 * Create UI store state for privacy mode and persistence.
 * @param {void} _unused - This function does not take input.
 * @returns {{privacyMode: import('vue').Ref<boolean>, togglePrivacy: () => void}} Store state and actions.
 */
export const useUiStore = defineStore("ui", () => {
  const privacyMode = ref(localStorage.getItem(PRIVACY_STORAGE_KEY) === "on");

  watch(privacyMode, (enabled) => {
    localStorage.setItem(PRIVACY_STORAGE_KEY, enabled ? "on" : "off");
    document.documentElement.setAttribute("data-private", enabled ? "on" : "off");
  });

  /**
   * Toggle privacy mode on and off.
   * @param {void} _unused - This function does not take input.
   * @returns {void} Nothing is returned.
   */
  const togglePrivacy = () => {
    privacyMode.value = !privacyMode.value;
  };

  return {
    privacyMode,
    togglePrivacy,
  };
});
