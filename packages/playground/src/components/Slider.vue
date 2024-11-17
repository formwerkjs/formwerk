<script setup lang="ts" generic="TValue">
import { useSlider, type SliderProps } from '@formwerk/core';

import Thumb from './Thumb.vue';

const props = defineProps<SliderProps<TValue>>();

const { trackProps, groupProps, labelProps, errorMessage, errorMessageProps, useThumbMetadata } = useSlider(props);

const thumbData = useThumbMetadata(0);
</script>

<template>
  <div class="slider" v-bind="groupProps">
    <div v-bind="labelProps" class="slider-label">{{ label }}</div>
    <div v-bind="trackProps" class="track">
      <Thumb />
    </div>

    <div v-if="errorMessage" v-bind="errorMessageProps" class="error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.slider {
  --track-width: 300px;

  font-family: 'Monaspace Neon Var';

  .slider-label {
    @apply block mb-1 w-full font-semibold text-lg text-white;
  }

  .track {
    display: flex;
    align-items: center;
    width: var(--track-width);
    height: 6px;
    background-color: #78716c;
    border-radius: 6px;

    &::before {
      content: '';
      width: calc(v-bind('thumbData.percent') * 100%);
      background-color: #059669;
      border-radius: 6px;
      height: 6px;
    }
  }

  .error {
    display: none;
    font-size: 13px;
    color: #f00;
    width: 100%;
  }

  &:has([aria-invalid='true']) {
    .error {
      display: block;
    }
  }
}
</style>
