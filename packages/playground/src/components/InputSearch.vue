<script setup lang="ts">
import { SearchFieldProps, useSearchField } from '@formwerk/core';

const props = defineProps<SearchFieldProps>();

const { inputProps, labelProps, fieldValue, displayError, errorMessageProps, clearBtnProps } = useSearchField(props);
</script>

<template>
  <div class="InputSearch">
    <label v-bind="labelProps">{{ label }}</label>

    <svg
      class="absolute left-3 bottom-[15px] text-gray-200 fill-current w-6 h-6"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
    >
      <path
        d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"
      ></path>
    </svg>

    <input v-bind="inputProps" placeholder="Search for..." />

    <span v-bind="errorMessageProps" class="error-message">
      {{ displayError() }}
    </span>

    <button v-show="fieldValue" v-bind="clearBtnProps" class="absolute right-4 bottom-[15px] text-gray-300">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 fill-current" viewBox="0 0 256 256">
        <path
          d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"
        ></path>
      </svg>
    </button>
  </div>
</template>

<style scoped lang="postcss">
@reference "../style.css";

.InputSearch {
  font-family: 'Monaspace Neon Var';
  @apply relative w-full max-w-xs;
  margin-bottom: calc(1em * 1.5);

  label {
    @apply block mb-1 w-full font-semibold text-lg text-white;
  }

  input {
    @apply rounded-md border-2 border-transparent py-3 w-full bg-zinc-800 focus:bg-zinc-900 focus:outline-hidden transition-colors duration-200 focus:border-emerald-500 disabled:cursor-not-allowed text-white font-medium;
    @apply px-10;

    &::-webkit-search-cancel-button,
    &::-webkit-search-decoration {
      -webkit-appearance: none;
    }
  }

  .error-message {
    @apply absolute left-0 text-sm text-red-500;
    bottom: calc(-1.5 * 1em);
  }

  &:has(:user-invalid) {
    input {
      @apply border-red-500;
    }
  }
}
</style>
