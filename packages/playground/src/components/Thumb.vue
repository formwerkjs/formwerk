<template>
  <div v-bind="thumbProps" class="rounded-full bg-gray-400 focus-visible:bg-blue-500 w-4 h-4 flex-shrink-0">
    <div
      v-if="isDragging"
      class="absolute -top-7 bg-blue-400 px-1.5 py-1 rounded text-xs text-white font-medium left-1/2 -translate-x-1/2"
    >
      {{ currentValue }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSliderThumb, SliderThumbProps } from '@formwerk/core';

const props = defineProps<SliderThumbProps>();

const { thumbProps, isDragging, currentValue } = useSliderThumb(props);
</script>
