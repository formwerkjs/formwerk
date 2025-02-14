<script setup lang="ts">
import { CheckboxProps, useCheckbox } from '@formwerk/core';

const props = defineProps<CheckboxProps>();

const { labelProps, inputProps, isChecked } = useCheckbox(props);
</script>

<template>
  <div v-bind="inputProps" class="item flex items-center">
    <div class="checkbox-square">
      <div v-if="indeterminate" class="w-3 h-1 bg-gray-400 shrink-0"></div>
      <div v-else class="w-4 h-4 rounded-md shrink-0">
        <svg v-if="isChecked" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="fill-emerald-500">
          <path
            d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"
          ></path>
        </svg>
      </div>
    </div>

    <span v-bind="labelProps" class="ml-1">{{ label }}</span>
  </div>
</template>

<style scoped>
@reference "../style.css";

.item {
  font-family: 'Monaspace Neon Var';
  @apply text-white font-medium flex items-center gap-2;

  .checkbox-square {
    @apply w-6 h-6 rounded-md shrink-0 border border-gray-600 flex items-center justify-center bg-zinc-800;
  }

  &:focus {
    @apply outline-hidden;

    .checkbox-square {
      @apply border-emerald-500;
    }
  }

  &[aria-checked='true'] {
    .checkbox-square {
      @apply bg-zinc-900;
    }
  }
}
</style>
