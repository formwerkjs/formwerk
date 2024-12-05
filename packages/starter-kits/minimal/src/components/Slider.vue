<script setup lang="ts">
import { useSlider, type SliderProps } from '@formwerk/core';
import SliderThumb from './SliderThumb.vue';

const props = defineProps<SliderProps>();

const { groupProps, trackProps, outputProps, labelProps, errorMessage, errorMessageProps, useThumbMetadata } =
  useSlider(props);

const thumbData = useThumbMetadata(0);
</script>

<template>
  <div v-bind="groupProps" class="field slider">
    <p v-bind="labelProps">{{ label }}</p>

    <div v-bind="trackProps" class="slider-track">
      <SliderThumb />
    </div>

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.slider-track {
  height: 4px;
  border-radius: 2px;
  background-color: gray;
  width: 100%;
  display: flex;
  align-items: center;

  &::before {
    content: '';
    width: calc(v-bind('thumbData.percent') * 100%);
    background-color: #000;
    border-radius: 6px;
    height: 6px;
  }
}

.error-message {
  color: red;
}
</style>
