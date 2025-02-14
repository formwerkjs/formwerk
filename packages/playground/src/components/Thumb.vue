<template>
  <div v-bind="thumbProps" class="thumb">
    <div class="tooltip">{{ currentValue }}</div>
  </div>
</template>

<script setup lang="ts">
import { useSliderThumb, type SliderThumbProps } from '@formwerk/core';

const props = defineProps<SliderThumbProps>();

const { thumbProps, currentValue } = useSliderThumb(props);
</script>

<style scoped>
@reference "../style.css";

.thumb {
  @apply bg-emerald-500 w-5 h-5 rounded-full;

  &:hover {
    @apply bg-emerald-600;
  }

  .tooltip {
    position: absolute;
    border-radius: 6px;
    display: none;
    font-size: 14px;
    color: #fff;
    @apply bg-emerald-600;
    left: 50%;
    top: 50%;
    translate: -50% 50%;
    padding: 6px;
  }

  &:focus,
  &:active {
    @apply outline-hidden bg-emerald-600;

    .tooltip {
      display: block;
    }
  }
}
</style>
