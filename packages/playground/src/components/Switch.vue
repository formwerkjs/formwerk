<script setup lang="ts">
import { useSwitch, SwitchProps } from '@formwerk/core';

const props = defineProps<SwitchProps>();

const { inputProps, labelProps, isPressed } = useSwitch(props);
</script>

<template>
  <div class="flex items-center">
    <div
      v-bind="inputProps"
      class="flex items-center p-1 w-10 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-hidden focus:ring-2 ring-emerald-500 ring-offset-2"
      :class="{ 'bg-emerald-500': isPressed, 'bg-gray-400': !isPressed }"
    >
      <div
        class="rounded-full w-4 h-4 shrink-0 bg-white origin-center transition-transform duration-200"
        :class="{ 'translate-x-4': isPressed }"
      ></div>
    </div>

    <label class="ml-3 text-white text-lg" v-bind="labelProps">{{ label }}</label>
  </div>
</template>
