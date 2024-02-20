<script setup lang="ts">
import { useSlider, SliderProps } from '@formwerk/core';
import Thumb from './Thumb.vue';

const props = defineProps<SliderProps>();

const { groupProps, trackProps, labelProps } = useSlider(props);
</script>

<template>
  <div class="slider" v-bind="groupProps" :class="{ vertical: orientation === 'vertical' }">
    <div v-bind="labelProps">{{ label }}</div>
    <div v-bind="trackProps" class="track">
      <Thumb />
      <Thumb />
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.slider {
  width: 150px;

  .track {
    @apply w-full py-2 flex items-center;
    &::before {
      content: '';
      @apply w-full bg-blue-600;
      height: 2px;
    }
  }

  &.vertical {
    height: 150px;
    width: unset;

    .track {
      @apply h-full w-8  flex-col;

      &::before {
        @apply h-full bg-blue-600;
        width: 2px;
        height: 100%;
      }
    }
  }
}
</style>
