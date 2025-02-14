<script setup lang="ts">
import { TextFieldProps, useTextField } from '@formwerk/core';

const props = defineProps<TextFieldProps>();

const { inputProps, labelProps, errorMessageProps, isTouched, displayError } = useTextField(props);
</script>

<template>
  <div class="InputText" :class="{ touched: isTouched }">
    <label v-bind="labelProps">{{ label }}</label> isTouched: {{ isTouched }}

    <input v-bind="inputProps" />

    <span v-bind="errorMessageProps" class="w-full truncate error-message">
      {{ displayError() }}
    </span>
  </div>
</template>

<style scoped lang="postcss">
@reference "../style.css";

.InputText {
  font-family: 'Monaspace Neon Var';
  @apply relative w-full;
  margin-bottom: calc(1em * 1.5);

  label {
    @apply block mb-1 w-full font-semibold text-lg text-white;
  }

  input {
    @apply max-w-xs rounded-md border-2 border-transparent py-3 px-4 w-full bg-zinc-800 focus:bg-zinc-900 focus:outline-hidden transition-colors duration-200 focus:border-emerald-500 disabled:cursor-not-allowed text-white font-medium;
  }

  .error-message {
    @apply absolute left-0 text-sm text-red-500 font-medium;
    bottom: calc(-1.8 * 1em);
  }

  &:has(:user-invalid),
  &:has(.error-message:not(:empty)) {
    input {
      @apply border-red-500;
    }
  }

  &:has(:disabled) {
    input {
      @apply bg-gray-200 cursor-not-allowed;
    }
  }
}
</style>
