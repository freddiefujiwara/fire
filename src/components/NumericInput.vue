<script setup>
import { ref, watch, onMounted } from 'vue';

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
  }
});

const emit = defineEmits(['update:modelValue', 'input']);

const displayValue = ref('');
const inputRef = ref(null);

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

  emit('update:modelValue', numericValue);
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

const onKeydown = (e) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    emit('update:modelValue', props.modelValue + props.step);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    emit('update:modelValue', Math.max(0, props.modelValue - props.step));
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
    @keydown="onKeydown"
    :disabled="disabled"
    :placeholder="placeholder"
    :class="props.class"
    inputmode="numeric"
  />
</template>
