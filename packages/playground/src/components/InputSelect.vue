<script setup lang="ts" generic="TOption, TValue">
import { useSelect, SelectProps } from '@formwerk/core';
import OptionItem from '@/components/OptionItem.vue';
import { onMounted, ref, watch } from 'vue';

const props = defineProps<SelectProps<TOption, TValue>>();

const { triggerProps, labelProps, errorMessageProps, isTouched, displayError, fieldValue, isOpen, listBoxProps } =
  useSelect(props);

const popoverEl = ref<HTMLElement | null>(null);

watch(isOpen, value => {
  if (value === popoverEl.value?.matches(':popover-open')) {
    return;
  }

  value ? popoverEl.value?.showPopover() : popoverEl.value?.hidePopover();
});

onMounted(() => {
  popoverEl.value?.addEventListener('toggle', evt => {
    const shouldBeOpen = evt.newState === 'open';
    if (isOpen.value === shouldBeOpen) {
      return;
    }

    isOpen.value = shouldBeOpen;
  });
});
</script>

<template>
  <div class="InputSelect" :class="{ touched: isTouched }">
    <label v-bind="labelProps">{{ label }}</label>

    <div v-bind="triggerProps" class="trigger flex items-center">
      {{ fieldValue || 'Select here' }}

      <span class="ml-auto">⬇️</span>
    </div>

    <div ref="popoverEl" v-bind="listBoxProps" popover class="listbox">
      <div v-for="opt in options" :key="opt">
        <OptionItem :option="opt">
          <slot name="option" :option="opt" />
        </OptionItem>
      </div>
    </div>

    <span v-bind="errorMessageProps" class="error-message">
      {{ displayError() }}
    </span>
  </div>
</template>

<style scoped lang="postcss">
.InputSelect {
  @apply relative w-full;
  margin-bottom: calc(1em * 1.5);

  label {
    @apply block mb-1 w-full;
  }

  .trigger {
    @apply text-gray-800 rounded-md border-2 border-transparent py-3 px-4 w-full bg-gray-100 focus-within:outline-none transition-colors duration-200 focus-within:border-blue-500  disabled:cursor-not-allowed;
    anchor-name: --trigger;
  }

  .error-message {
    @apply absolute left-0 text-sm text-red-500;
    bottom: calc(-1.5 * 1em);
  }

  .listbox {
    margin: 0;
    position-anchor: --trigger;
    position-area: bottom;
    inset-area: bottom;
    @apply shadow-sm border border-gray-200 w-[300px];
  }

  &.touched {
    input {
      @apply bg-blue-50;
    }
  }
}
</style>
