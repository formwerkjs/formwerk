<script setup lang="ts">
import { type RadioProps, useRadio } from '@formwerk/core';

const props = defineProps<RadioProps>();

const { labelProps, inputProps } = useRadio(props);
</script>

<template>
  <div class="radio-item" v-bind="inputProps">
    <div class="radio-item-inner">
      <div class="radio-item-inner-circle"></div>
    </div>

    <div v-bind="labelProps" class="radio-item-label">
      {{ label }}
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.radio-item {
  @apply text-white font-medium flex items-center gap-2;

  .radio-item-inner {
    @apply w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 transition-all duration-200;
  }

  .radio-item-inner-circle {
    @apply w-2.5 h-2.5 rounded-full bg-zinc-800 transition-all duration-200;
  }

  &[aria-checked='true'] {
    .radio-item-inner-circle {
      @apply bg-emerald-500;
    }

    .radio-item-inner {
      @apply border-emerald-500;
    }
  }

  &:focus {
    @apply outline-hidden;

    .radio-item-inner {
      @apply border-emerald-500;
    }
  }

  .radio-item-label {
    @apply select-none;
  }
}

/** This is a common utility CSS class, you can find it in your CSS framework of choice */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
