<script setup lang="ts">
import { useDateTimeField, DateTimeFieldProps, DateTimeSegment } from '@formwerk/core';

const props = defineProps<DateTimeFieldProps>();

const { controlProps, isTouched, labelProps, errorMessageProps, errorMessage, segments, fieldValue } =
  useDateTimeField(props);
</script>

<template>
  <div class="InputDate" :class="{ touched: isTouched }">
    <span class="label" v-bind="labelProps">{{ label }}</span>

    {{ fieldValue }}

    <div v-bind="controlProps" class="control">
      <DateTimeSegment
        v-for="segment in segments"
        v-bind="segment"
        class="segment"
        :disabled="segment.type === 'year'"
      />
    </div>

    <span v-bind="errorMessageProps" class="w-full truncate error-message">
      {{ errorMessage }}
    </span>
  </div>
</template>

<style scoped lang="postcss">
.InputDate {
  font-family: 'Monaspace Neon Var';
  @apply relative w-full;
  margin-bottom: calc(1em * 1.5);

  .label {
    @apply block mb-1 w-full font-semibold text-lg text-white;
  }

  .control {
    @apply max-w-xs rounded-md border-2 border-transparent py-3 px-4 w-full bg-zinc-800 focus:bg-zinc-900 focus:outline-none transition-colors duration-200 focus:border-emerald-500 disabled:cursor-not-allowed text-white font-medium;
  }

  .segment {
    @apply p-0.5 rounded focus:outline-none focus:bg-blue-600;
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
