<script setup lang="ts">
import { TextFieldProps, useTextField } from '@formwerk/core';
import { watch } from 'vue';

const props = defineProps<TextFieldProps>();

const {
  inputProps,
  inputRef,
  labelProps,
  fieldValue,
  errorMessage,
  errorMessageProps,
} = useTextField(props);

watch(fieldValue, (value) => {
  console.log(value, inputRef.value.validity, inputRef.value.validationMessage);
});
</script>

<template>
  <div class="InputText">
    <label v-bind="labelProps">{{ label }}</label>

    <textarea ref="inputRef" v-bind="inputProps" />

    <span v-bind="errorMessageProps" class="error-message">
      {{ errorMessage }}
    </span>
  </div>
</template>

<style scoped lang="postcss">
.InputText {
  @apply relative w-full;
  margin-bottom: calc(1em * 1.5);

  label {
    @apply block mb-1 w-full;
  }

  textarea {
    @apply text-gray-800 rounded-md border-2 border-transparent py-3 px-4 w-full bg-gray-100 focus:outline-none transition-colors duration-200 focus:border-blue-500;
  }
  .error-message {
    @apply absolute left-0 text-sm text-red-500;
    bottom: calc(-1.5 * 1em);
  }

  &.has-error {
    textarea {
      @apply bg-red-100 text-red-600 focus:border-red-500;
    }
  }
}
</style>
