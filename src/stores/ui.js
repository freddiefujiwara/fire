import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useUiStore = defineStore("ui", () => {
  const privacyMode = ref(localStorage.getItem("asset-privacy") === "on");

  watch(privacyMode, (enabled) => {
    localStorage.setItem("asset-privacy", enabled ? "on" : "off");
    document.documentElement.setAttribute("data-private", enabled ? "on" : "off");
  });

  const togglePrivacy = () => {
    privacyMode.value = !privacyMode.value;
  };

  return {
    privacyMode,
    togglePrivacy,
  };
});
