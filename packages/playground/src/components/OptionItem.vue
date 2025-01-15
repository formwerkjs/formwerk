<template>
  <div v-bind="optionProps" class="option px-2 rounded py-1 border">
    <slot> {{ label }} </slot>
  </div>
</template>

<script setup lang="ts">
import { OptionProps, useOption } from '@formwerk/core';

const props = defineProps<OptionProps<any>>();

const { optionProps } = useOption(props);
</script>

<style scoped>
.option {
  @apply border border-transparent select-none text-white font-normal cursor-pointer;

  &:focus {
    @apply bg-emerald-500 outline-none text-red-500;
  }

  &[aria-selected='true'] {
    @apply bg-emerald-500 text-white;
  }

  &[aria-checked='true'] {
    @apply bg-purple-500 text-white;
  }
}
</style>
