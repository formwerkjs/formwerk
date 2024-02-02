<script setup lang="ts">
import { useSwitch, SwitchProps } from '@formwerk/core';

const props = defineProps<SwitchProps>();

const { switchProps, labelProps, isPressed } = useSwitch(props);
</script>

<template>
  <div class="flex items-center">
    <div
      v-bind="switchProps"
      class="flex items-center p-1 w-9 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus:ring-2 ring-blue-500 ring-offset-2"
      :class="{ 'bg-blue-500': isPressed, 'bg-gray-400': !isPressed }"
    >
      <div
        class="rounded-full w-3 h-3 flex-shrink-0 bg-white origin-center transition-transform duration-200"
        :class="{ 'translate-x-4': isPressed }"
      ></div>
    </div>

    <label class="ml-2" v-bind="labelProps">{{ label }}</label>
  </div>
</template>
