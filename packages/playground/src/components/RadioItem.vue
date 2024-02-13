<script setup lang="ts">
import { RadioFieldProps, useRadioField } from '@formwerk/core';

const props = defineProps<RadioFieldProps>();

const { labelProps, radioProps, isChecked } = useRadioField(props);
</script>

<template>
  <div class="flex items-center">
    <div
      v-bind="radioProps"
      class="w-5 h-5 rounded-full flex-shrink-0 border border-gray-600 flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <div class="w-3 h-3 rounded-full flex-shrink-0" :class="{ 'bg-blue-500': isChecked }" />
    </div>

    <label v-bind="labelProps" class="ml-1">{{ label }}</label>
  </div>
</template>
