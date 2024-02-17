<script setup lang="ts">
import { useSlider, SliderProps } from '@formwerk/core';
import Thumb from './Thumb.vue';

const props = defineProps<SliderProps>();

const { groupProps, labelProps } = useSlider(props);
</script>

<template>
  <div>
    <div v-bind="labelProps">{{ label }}</div>
    <div v-bind="groupProps" class="track">
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
