# useNumberField

Number fields are a common field in many forms, but natively they don't provide a great user experience. Here are a few cases where the native number input falls short:

- It doesn't support different numeral systems. For example Arabic numerals (٠١٢٣٤٥٦٧٨٩) are a pain to work with.
- No formatting support, this includes grouping `,` and displaying units and currencies.

This composable provides the behavior, state and accessibility implementation for number inputs along with the localization and formatting features to address these issues.

## Features

- Uses `input` element as a base with `type="text"` (don't worry, we use `inputmode` for accessability).
- Labeling and descriptions are automatically linked to input and label elements.
- Validation and error messages support either native or otherwise.
- Formatting and parsing numbers with the `Intl.NumberFormat` API depending on the user locale.
- Support for different numeral systems.
- Support for `Intl.NumberFormat` units and currencies.
- Support for the Spinbutton ARIA pattern for increment/decrement buttons.
- Support for `min`, `max` and `step` attributes.
- Support for `v-model` binding.

## Usage

```vue
<script setup lang="ts">
import { NumberFieldProps, useNumberField } from '@formwerk/core';

const props = defineProps<NumberFieldProps>();

const { inputProps, labelProps, errorMessage, errorMessageProps, incrementButtonProps, decrementButtonProps } =
  useNumberField(props);
</script>

<template>
  <div class="InputNumber">
    <label v-bind="labelProps">{{ label }}</label>

    <div class="flex items-stretch">
      <button type="button" v-bind="decrementButtonProps">-</button>
      <input v-bind="inputProps" />

      <button type="button" v-bind="incrementButtonProps">+</button>
    </div>

    <span v-bind="errorMessageProps" class="error-message">
      {{ errorMessage }}
    </span>
  </div>
</template>
```
