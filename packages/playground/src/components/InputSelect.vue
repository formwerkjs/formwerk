<script setup lang="ts" generic="TOption extends { label: string }, TValue">
import { useSelect, SelectProps } from '@formwerk/core';
import OptionItem from './OptionItem.vue';
import OptionGroup from './OptionGroup.vue';

export interface TheProps<TOption, TValue> extends SelectProps<TOption, TValue> {
  groups?: { items: TOption[]; label: string }[];
  options?: TOption[];
}

const props = defineProps<TheProps<TOption, TValue>>();

const { triggerProps, labelProps, errorMessageProps, isTouched, displayError, fieldValue, listBoxProps } =
  useSelect(props);
</script>

<template>
  <div class="InputSelect" :class="{ touched: isTouched }">
    <label v-bind="labelProps">{{ label }}</label>

    <div v-bind="triggerProps" class="trigger flex items-center">
      {{ fieldValue || 'Select here' }}

      <span class="ml-auto">⬇️</span>
    </div>

    <div v-bind="listBoxProps" popover class="listbox">
      <slot>
        <template v-if="groups">
          <OptionGroup v-for="group in groups" :key="group.label" :label="group.label">
            <slot name="group" :options="group.items">
              <OptionItem
                v-for="(option, idx) in group.items"
                :key="(getValue?.(option) as any) ?? idx"
                :option="option"
                :label="option.label"
              >
                <slot name="option" :option="option">
                  {{ option.label }}
                </slot>
              </OptionItem>
            </slot>
          </OptionGroup>
        </template>

        <template v-else-if="options">
          <OptionItem
            v-for="(option, idx) in options"
            :key="(getValue?.(option) as any) ?? idx"
            :option="option"
            :label="option.label"
          >
            <slot name="option" :option="option" />
          </OptionItem>
        </template>
      </slot>
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
    @apply p-0 max-h-[60vh] relative;
    position-anchor: --trigger;
    position-area: bottom;
    inset-area: bottom;
    @apply shadow-sm border border-gray-200 w-[300px];
    opacity: 0;
    transition:
      display 0.4s allow-discrete,
      opacity 0.4s allow-discrete,
      transform 0.4s allow-discrete,
      overlay 0.4s allow-discrete;

    &:popover-open {
      opacity: 1;
    }
  }

  &.touched {
    input {
      @apply bg-blue-50;
    }
  }
}

@starting-style {
  .listbox:popover-open {
    opacity: 0;
  }
}
</style>
