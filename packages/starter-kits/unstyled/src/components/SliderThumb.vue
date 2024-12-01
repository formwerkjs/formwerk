<script setup lang="ts">
import { useSliderThumb, type SliderThumbProps } from '@formwerk/core';

const props = defineProps<SliderThumbProps>();

const { thumbProps, isDragging } = useSliderThumb(props);
</script>

<template>
  <div v-bind="thumbProps" class="slider-thumb">
    <div v-if="isDragging" class="slider-thumb-dragging"></div>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.slider-thumb {
  width: 16px;
  height: 16px;
  background-color: white;
  border-radius: 999999px;
  border: 1px solid black;
}
</style>
