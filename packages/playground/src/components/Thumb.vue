<template>
  <div v-bind="thumbProps" class="rounded-full bg-gray-400 focus-visible:bg-blue-500 w-4 h-4 flex-shrink-0"></div>
</template>

<script setup lang="ts">
import { useSliderThumb, SliderThumbProps } from '@formwerk/core';

const props = defineProps<SliderThumbProps>();

const { thumbProps } = useSliderThumb(props);
</script>
