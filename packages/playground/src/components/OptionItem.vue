<template>
  <div v-bind="optionProps" class="option">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { OptionProps, useOption } from '@formwerk/core';

const props = defineProps<OptionProps<any>>();

const { optionProps } = useOption(props);
</script>

<style scoped>
.option:focus {
  @apply bg-gray-200 outline-none;
}

[aria-selected='true'],
[aria-checked='true'] {
  @apply bg-gray-700 text-white;
}
</style>
