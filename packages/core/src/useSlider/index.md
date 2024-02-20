# Slider

> A slider is an input where the user selects a value from within a given range. Sliders typically have a slider thumb that can be moved along a bar, rail, or track to change the value of the slider.

This composable provides the behavior, state and accessibility implementation for slider components.

## Features

- Labeling and descriptions for thumbs and slider elements.
- `v-model` support for binding the value of the slider and the individual thumbs.
- Multi-thumb support with auto value clamping.
- Support for `min`, `max` and `step` attributes.
- Support for both horizontal and vertical orientations.
- Support for both LTR and RTL directions.
- Interactive behaviors:
  - Clicking the track element sets the value of the slider or the nearest suitable thumb to the clicked position.
  - Dragging the thumb element changes the value of the slider.
- Keyboard support
  - <kbd>ArrowLeft</kbd> and <kbd>ArrowRight</kbd> keys increment and decrement the value respectively.
  - <kbd>Home</kbd> and <kbd>End</kbd> keys set the value to the minimum and maximum values respectively.
  - <kbd>PageUp</kbd> and <kbd>PageDown</kbd> keys increment and decrement the value by a large step respectively.
  - Keys adapt to the direction (RTL or LTR) of the slider and the orientation of the slider (horizontal or vertical).

## Usage

### Thumb Component

```vue
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
```

### Single Slider

```vue
<script setup lang="ts">
import { useSlider, SliderProps } from '@formwerk/core';
import Thumb from './Thumb.vue';

const props = defineProps<SliderProps>();

const { trackProps, groupProps, labelProps } = useSlider(props);
</script>

<template>
  <div class="slider" v-bind="groupProps" :class="{ vertical: orientation === 'vertical' }">
    <div v-bind="labelProps">{{ label }}</div>
    <div v-bind="trackProps" class="track">
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
```

### Multi Thumb Slider

```vue
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
```
