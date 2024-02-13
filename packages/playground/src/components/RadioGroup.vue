<script setup lang="ts">
import { RadioGroupProps, useRadioGroup } from '@formwerk/core';

const props = defineProps<RadioGroupProps>();

const { radioGroupProps, labelProps, descriptionProps, errorMessageProps, errorMessage } = useRadioGroup(props);
</script>

<template>
  <div
    v-bind="radioGroupProps"
    class="flex border border-gray-200 rounded-md p-2"
    :class="{ 'flex-col': orientation !== 'horizontal' }"
  >
    <span
      v-bind="labelProps"
      class="font-medium"
      :class="{ 'mr-4': orientation === 'horizontal', 'mb-4': orientation !== 'horizontal' }"
      >{{ label }}</span
    >

    <slot />

    <div v-if="errorMessageProps" v-bind="errorMessageProps" class="text-red-500 text-xs">{{ errorMessage }}</div>

    <div v-else-if="description" v-bind="descriptionProps" class="text-gray-500 text-xs">{{ description }}</div>
  </div>
</template>
