<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  id: {
    type: String,
    default: ''
  },
  modelValue: {
    type: Number,
    required: true
  },
  step: {
    type: Number,
    default: 1
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: ''
  },
  class: {
    type: String,
    default: ''
  },
  modelModifiers: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue', 'input']);

const displayValue = ref('');
const inputRef = ref(null);
const lazyMode = computed(() => Boolean(props.modelModifiers?.lazy));

const formatNumber = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '';
  return Math.round(val).toLocaleString('ja-JP');
};

const parseNumber = (str) => {
  const num = parseInt(str.replace(/,/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

watch(() => props.modelValue, (newVal) => {
  const formatted = formatNumber(newVal);
  // Always update if displayValue is empty or if values don't match
  if (displayValue.value === '' || parseNumber(displayValue.value) !== newVal) {
    displayValue.value = formatted;
  }
}, { immediate: true });

const onInput = (e) => {
  const el = e.target;
  const originalSelectionStart = el.selectionStart;
  const originalValue = el.value;

  const numericValue = parseNumber(originalValue);
  displayValue.value = formatNumber(numericValue);

  if (!lazyMode.value) {
    emit('update:modelValue', numericValue);
  }
  emit('input', e);

  // Restore cursor position
  setTimeout(() => {
    if (!inputRef.value) return;
    const newVal = inputRef.value.value;
    const diff = newVal.length - originalValue.length;
    let newPosition = originalSelectionStart + diff;
    inputRef.value.setSelectionRange(newPosition, newPosition);
  }, 0);
};

const onBlur = () => {
  if (!lazyMode.value) return;
  emit('update:modelValue', parseNumber(displayValue.value));
};

const onKeydown = (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const nextValue = props.modelValue + props.step;
    displayValue.value = formatNumber(nextValue);
    if (!lazyMode.value) {
      emit('update:modelValue', nextValue);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextValue = Math.max(0, props.modelValue - props.step);
    displayValue.value = formatNumber(nextValue);
    if (!lazyMode.value) {
      emit('update:modelValue', nextValue);
    }
  }
};
</script>

<template>
  <input
    ref="inputRef"
    :id="id"
    type="text"
    v-model="displayValue"
    @input="onInput"
    @blur="onBlur"
    @keydown="onKeydown"
    :disabled="disabled"
    :placeholder="placeholder"
    :class="props.class"
    inputmode="numeric"
  />
</template>
