<script setup lang="ts">
import { useSlider, type SliderProps } from '@formwerk/core';
import SliderThumb from './SliderThumb.vue';

const props = defineProps<SliderProps>();

const { groupProps, trackProps, outputProps, labelProps, errorMessage, errorMessageProps } = useSlider(props);
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
}

.error-message {
  color: red;
}
</style>
