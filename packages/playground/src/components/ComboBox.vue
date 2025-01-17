<script setup lang="ts" generic="TOption extends { label: string; value: string }, TValue">
import { useComboBox, ComboBoxProps, useDefaultFilter } from '@formwerk/core';
import Option from './OptionItem.vue';

interface Props extends ComboBoxProps<TOption, TValue> {
  options?: TOption[];
}

const props = defineProps<Props>();

const { contains } = useDefaultFilter({
  caseSensitive: false,
});

const {
  inputProps,
  listBoxProps,
  labelProps,
  buttonProps,
  errorMessageProps,
  errorMessage,
  descriptionProps,
  isListEmpty,
} = useComboBox(props, {
  filter: contains,
});
</script>

<template>
  <div class="select-field">
    <p v-bind="labelProps">{{ label }}</p>

    <div class="flex items-center gap-2">
      <div class="flex items-center gap-1">
        <input v-bind="inputProps" type="text" />
      </div>

      <button v-bind="buttonProps">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
          <path
            d="M184.49,167.51a12,12,0,0,1,0,17l-48,48a12,12,0,0,1-17,0l-48-48a12,12,0,0,1,17-17L128,207l39.51-39.52A12,12,0,0,1,184.49,167.51Zm-96-79L128,49l39.51,39.52a12,12,0,0,0,17-17l-48-48a12,12,0,0,0-17,0l-48,48a12,12,0,0,0,17,17Z"
          ></path>
        </svg>
      </button>
    </div>

    <div v-bind="listBoxProps" popover>
      <slot>
        <Option v-for="option in options" :key="option.label" :label="option.label" :value="option" />
      </slot>

      <div v-if="isListEmpty" class="text-white text-gray-400">No options found</div>
    </div>

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="description" v-bind="descriptionProps">{{ description }}</p>
  </div>
</template>

<style scoped>
button {
  svg {
    width: 16px;
    height: 16px;
    margin-left: auto;
  }
}

[popover] {
  position-anchor: --combobox;
  position-area: bottom;
  inset: 0;
  margin: 0;
  background: black;
}

input {
  anchor-name: --combobox;
}
</style>
