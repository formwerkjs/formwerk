<template>
  <div v-bind="optionProps" :class="{ 'bg-gray-400': isHighlighted }">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { OptionProps, useOption } from '@formwerk/core';

const props = defineProps<OptionProps<any>>();

const { optionProps, isHighlighted, isSelected } = useOption(props);
</script>

<style scoped>
[aria-selected='true'] {
  @apply bg-gray-700 text-white;
}
</style>
/
