<script setup lang="ts">
import { useSwitch, SwitchProps } from '@formwerk/core';

const props = defineProps<SwitchProps>();

const { inputProps, isPressed } = useSwitch(props);
</script>

<template>
  <label class="flex items-center">
    <div
      class="flex items-center p-1 w-9 rounded-full transition-colors duration-200 cursor-pointer focus-within:ring-2 ring-blue-500 ring-offset-2"
      :class="{ 'bg-blue-500': isPressed, 'bg-gray-400': !isPressed }"
    >
      <input v-bind="inputProps" type="checkbox" class="sr-only" />

      <div
        class="rounded-full w-3 h-3 flex-shrink-0 bg-white origin-center transition-transform duration-200"
        :class="{ 'translate-x-4': isPressed }"
      ></div>
    </div>

    <slot />
  </label>
</template>
