<script setup lang="ts" generic="TValue">
import { useSlider, type SliderProps } from '@formwerk/core';

import Thumb from './Thumb.vue';

const props = defineProps<SliderProps<TValue>>();

const { trackProps, groupProps, labelProps, errorMessage, errorMessageProps, useThumbMetadata } = useSlider(props);

const t1 = useThumbMetadata(0);
const t2 = useThumbMetadata(1);
</script>

<template>
  <div class="slider" v-bind="groupProps">
    <div v-bind="labelProps" class="slider-label">{{ label }}</div>
    <div v-bind="trackProps" class="track">
      <Thumb />
      <Thumb />
    </div>

    <div v-if="errorMessage" v-bind="errorMessageProps">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

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
    margin-top: 12px;
    margin-bottom: 24px;
    height: 6px;
    background-color: #78716c;
    border-radius: 6px;

    &::before {
      content: '';
      width: calc((v-bind('t2.sliderPercent') - v-bind('t1.sliderPercent')) * 100%);
      background-color: #10b981;
      border-radius: 6px;
      height: 6px;
      translate: calc(v-bind('t1.sliderPercent') * var(--track-width)) 0;
    }
  }
}
</style>
