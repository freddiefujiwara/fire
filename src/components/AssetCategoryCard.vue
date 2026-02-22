<script setup>
import { computed } from "vue";
import { formatYen } from "@/domain/format";

const props = defineProps({
  title: { type: String, required: true },
  amountYen: { type: Number, default: 0 },
  count: { type: Number, default: 0 },
  isLiability: { type: Boolean, default: false },
});

const safeCount = computed(() => Number(props.count) || 0);
const amountText = computed(() => {
  const formatted = formatYen(props.amountYen);
  return props.isLiability ? `-${formatted}` : formatted;
});
const amountClass = computed(() => (props.isLiability ? "is-negative" : "is-positive"));
</script>

<template>
  <article class="card">
    <h3 class="section-title">{{ title }}</h3>
    <p :class="['amount-value', amountClass]">{{ amountText }}</p>
    <p class="meta">{{ safeCount }}件</p>
  </article>
</template>
