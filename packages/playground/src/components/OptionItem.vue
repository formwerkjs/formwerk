<template>
  <div v-bind="optionProps" class="option px-2 rounded-sm py-1 border">
    <slot> {{ label }} </slot>
  </div>
</template>

<script setup lang="ts">
import { OptionProps, useOption } from '@formwerk/core';

const props = defineProps<OptionProps<any>>();

const { optionProps } = useOption(props);
</script>

<style scoped>
@reference "../style.css";

.option {
  @apply border-2 border-transparent select-none text-white font-normal cursor-pointer;

  &:focus {
    @apply bg-emerald-500 outline-hidden text-red-500;
  }

  &[aria-selected='true'] {
    @apply border-emerald-500 text-white;
  }

  &[aria-checked='true'] {
    @apply bg-emerald-500 text-white;

    &[aria-selected='true'] {
      @apply bg-purple-600 text-white;
    }
  }
}
</style>
