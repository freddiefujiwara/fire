<script setup>
import { ref, computed } from "vue";
import { useUiStore } from "@/stores/ui";

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  successLabel: {
    type: String,
    default: "コピー完了！",
  },
  copyValue: {
    type: [String, Function],
    required: true,
  },
  disabledOnPrivacy: {
    type: Boolean,
    default: false,
  },
});

const uiStore = useUiStore();
const isDisabled = computed(() => props.disabledOnPrivacy && uiStore.privacyMode);

const done = ref(false);
let timer = null;

const copyText = async (text) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
};

const handleClick = async () => {
  if (isDisabled.value) return;
  try {
    const text = typeof props.copyValue === "function" ? await props.copyValue() : props.copyValue;
    await copyText(text);

    done.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      done.value = false;
    }, 1800);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
};
</script>

<template>
  <button
    class="theme-toggle"
    :class="{ 'is-disabled': isDisabled }"
    type="button"
    @click="handleClick"
    :disabled="isDisabled"
    :title="isDisabled ? 'コピーするにはモザイクを解除してください' : ''"
  >
    {{ done ? successLabel : label }}
  </button>
</template>

<style scoped>
.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
