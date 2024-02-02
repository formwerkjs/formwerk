# useSearchField

> input elements of type search are text fields designed for the user to enter search queries into. These are functionally identical to text inputs, but may be styled differently by the user agent.

Search fields have extra behaviors and use-cases that set them apart from regular text fields. This composable provides the behavior, state and accessibility implementation for search fields.

A couple of behaviors set this apart from regular text fields:

- They can be cleared with `Escape` keyboard key or the clear button.
- They usually are used without a parent `form` elements and sometimes without a `submit` button. So they can be submitted with `Enter` keyboard key on their own.

Some of these behaviors can be checked [here](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/search#differences_between_search_and_text_types).

## Features

- Uses `input[type="search"]` element as a base.
- Labeling and descriptions are automatically linked to input and label elements.
- Keyboard support for <kbd>Enter</kbd> key to submit the current value.
- Keyboard support for <kbd>Escape</kbd> key to clear the current value.
- Support for custom clear button.
- Validation and error messages support either native or otherwise.

## Usage

```vue
<script setup lang="ts">
import { SearchFieldProps, useSearchField } from '@formwerk/core';

const props = defineProps<SearchFieldProps>();

const { inputProps, labelProps, fieldValue, errorMessage, errorMessageProps, clearBtnProps } = useSearchField(props);
</script>

<template>
  <div class="InputSearch">
    <label v-bind="labelProps">{{ label }}</label>

    <input v-bind="inputProps" type="text xd" />

    <span v-bind="errorMessageProps" class="error-message">
      {{ errorMessage }}
    </span>

    <button v-show="fieldValue" v-bind="clearBtnProps" class="absolute right-4 bottom-3">❌</button>
  </div>
</template>

<style scoped lang="postcss">
.InputSearch {
  @apply relative w-full;
  margin-bottom: calc(1em * 1.5);

  label {
    @apply block mb-1 w-full;
  }

  input {
    @apply text-gray-800 rounded-md border-2 border-transparent py-3 px-4 w-full bg-gray-100 focus:outline-none transition-colors duration-200 focus:border-blue-500 appearance-none;

    &::-webkit-search-cancel-button,
    &::-webkit-search-decoration {
      -webkit-appearance: none;
    }
  }
  .error-message {
    @apply absolute left-0 text-sm text-red-500;
    bottom: calc(-1.5 * 1em);
  }

  &.has-error {
    input {
      @apply bg-red-100 text-red-600 focus:border-red-500;
    }
  }
}
</style>
```
