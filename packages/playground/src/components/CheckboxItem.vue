<script setup lang="ts">
import { CheckboxProps, useCheckbox } from '@formwerk/core';

const props = defineProps<CheckboxProps>();

const { labelProps, inputProps, isChecked } = useCheckbox(props);
</script>

<template>
  <div v-bind="inputProps" class="flex items-center">
    <div
      class="w-5 h-5 rounded-md flex-shrink-0 border border-gray-600 flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <div v-if="indeterminate" class="w-3 h-1 bg-gray-400 flex-shrink-0"></div>
      <div v-else class="w-3 h-3 rounded-md flex-shrink-0" :class="{ 'bg-blue-500': isChecked }" />
    </div>

    <span v-bind="labelProps" class="ml-1">{{ label }}</span>
  </div>
</template>

<style scoped>
[aria-disabled='true'] {
  @apply opacity-50;
}
</style>
