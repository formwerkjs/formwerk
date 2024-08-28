<template>
  <div v-bind="optionProps" class="option px-2 rounded-md py-0.5 border">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { OptionProps, useOption } from '@formwerk/core';

const props = defineProps<OptionProps<any>>();

const { optionProps } = useOption(props);
</script>

<style scoped>
.option {
  @apply border border-transparent select-none;
  &:focus {
    @apply border-gray-400 outline-none;
  }

  &[aria-selected='true'],
  &[aria-checked='true'] {
    @apply bg-blue-700 text-white;
  }
}
</style>
