<script setup lang="ts">
import { useSlider, SliderProps } from '@formwerk/core';
import Thumb from './Thumb.vue';

const props = defineProps<SliderProps>();

const { trackProps, groupProps, labelProps } = useSlider(props);
</script>

<template>
  <div v-bind="groupProps">
    <div v-bind="labelProps">{{ label }}</div>
    <div v-bind="trackProps" class="track">
      <Thumb />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.track {
  @apply w-full py-2 relative flex items-center;
  &::before {
    content: '';
    @apply w-full bg-blue-600;
    height: 2px;
  }
}
</style>
