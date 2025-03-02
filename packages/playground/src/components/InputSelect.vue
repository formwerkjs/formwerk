<script setup lang="ts" generic="TOption extends { label: string }, TValue">
import { useSelect, SelectProps } from '@formwerk/core';
import OptionItem from './OptionItem.vue';
import OptionGroup from './OptionGroup.vue';

export interface TheProps<TOption, TValue> extends SelectProps<TOption, TValue> {
  groups?: { items: TOption[]; label: string }[];
  options?: TOption[];
  getOptionValue?: (option: TOption) => TValue;
}

const props = defineProps<TheProps<TOption, TValue>>();

const { triggerProps, labelProps, errorMessageProps, isTouched, errorMessage, fieldValue, listBoxProps } =
  useSelect(props);
</script>

<template>
  <div class="InputSelect" :class="{ touched: isTouched }">
    <label v-bind="labelProps">{{ label }}</label>

    <div v-bind="triggerProps" class="trigger flex items-center">
      {{ fieldValue || 'Select a country' }}

      <span class="ml-auto">
        <svg xmlns="http://www.w3.org/2000/svg" class="text-zinc-400 fill-current w-6 h-6" viewBox="0 0 256 256">
          <path
            d="M184.49,167.51a12,12,0,0,1,0,17l-48,48a12,12,0,0,1-17,0l-48-48a12,12,0,0,1,17-17L128,207l39.51-39.52A12,12,0,0,1,184.49,167.51Zm-96-79L128,49l39.51,39.52a12,12,0,0,0,17-17l-48-48a12,12,0,0,0-17,0l-48,48a12,12,0,0,0,17,17Z"
          ></path>
        </svg>
      </span>
    </div>

    <div v-bind="listBoxProps" popover class="listbox">
      <slot>
        <template v-if="groups">
          <OptionGroup v-for="group in groups" :key="group.label" :label="group.label">
            <slot name="group" :options="group.items">
              <OptionItem
                v-for="(option, idx) in group.items"
                :key="(option as any) ?? idx"
                :value="getOptionValue?.(option) ?? option"
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
            :key="option.label ?? idx"
            :value="getOptionValue?.(option) ?? option"
            :label="option.label"
          >
            <slot name="option" :option="option" />
          </OptionItem>
        </template>
      </slot>
    </div>

    <span v-bind="errorMessageProps" class="error-message">
      {{ errorMessage }}
    </span>
  </div>
</template>

<style scoped lang="postcss">
@reference "../style.css";

.InputSelect {
  font-family: 'Monaspace Neon Var';
  @apply relative w-full max-w-xs;
  margin-bottom: calc(1em * 1.5);

  label {
    @apply block mb-1 w-full font-semibold text-lg text-white;
  }

  .trigger {
    @apply bg-zinc-800 focus:bg-zinc-900 w-full  rounded-md border-2 border-transparent py-3 px-4 text-white font-medium cursor-pointer transition-all duration-200;
    anchor-name: --trigger;

    &:focus {
      @apply outline-hidden border-emerald-500;
    }

    &:hover {
      @apply bg-zinc-900;
    }
  }

  .error-message {
    @apply absolute left-0 text-sm text-red-500;
    bottom: calc(-1.5 * 1em);
  }
}

.listbox {
  margin: 0;
  width: 320px;
  @apply p-0 max-h-[60vh] relative;
  position-anchor: --trigger;
  position-area: bottom;
  inset-area: bottom;
  transform: scale(0.9);
  transform-origin: top;

  @apply shadow-lg border border-zinc-600 bg-zinc-900 rounded-md mt-1;
  opacity: 0;
  transition:
    display 0.1s allow-discrete,
    opacity 0.1s allow-discrete,
    transform 0.1s allow-discrete,
    overlay 0.1s allow-discrete;

  &:popover-open {
    opacity: 1;
    transform: scale(1);
  }

  scrollbar-width: thin;
  overflow-y: auto;
  overflow-y: overlay;
  scrollbar-color: rgb(63 63 70) transparent;
}

@starting-style {
  .listbox :popover-open {
    opacity: 0;
    transform: scale(0.9);
  }
}
</style>
