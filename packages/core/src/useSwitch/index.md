# useSwitch

> A switch is an input widget that allows users to choose one of two values: on or off. Switches are similar to checkboxes and toggle buttons, which can also serve as binary inputs. One difference, however, is that switches can only be used for binary input.

This composable provides the behavior, state and accessibility implementation for switch components.

The switch field has enough unique behaviors and use-cases that justifies it having its own composable. The binary state of a switch means it shouldn't be used to represent "required" inputs where the switch needs to be "on". It is a user preference that can be turned off. This implies a few things, one of which is that the switch is not validatable.

## Features

- You can use `input[type="checkbox"]` element as a base or any custom element.
- Labeling and descriptions are automatically linked to switch and label elements.
- Keyboard support for <kbd>Space</kbd> key to toggle the current value.

## Usage

### With input elements (recommended)

```vue
<script setup lang="ts">
import { useSwitch, SwitchFieldProps } from '@formwerk/core';

const props = defineProps<SwitchFieldProps>();

const { inputProps, labelProps, isPressed, handleClick } = useSwitch(props);
</script>

<template>
  <div class="flex items-center">
    <div
      class="flex items-center p-1 w-9 rounded-full transition-colors duration-200 cursor-pointer focus-within:ring-2 ring-blue-500 ring-offset-2"
      :class="{ 'bg-blue-500': isPressed, 'bg-gray-400': !isPressed }"
      @click="handleClick"
    >
      <input v-bind="inputProps" type="checkbox" class="sr-only" />

      <div
        class="rounded-full w-3 h-3 flex-shrink-0 bg-white origin-center transition-transform duration-200"
        :class="{ 'translate-x-4': isPressed }"
      ></div>
    </div>

    <label class="ml-2" v-bind="labelProps">{{ label }}</label>
  </div>
</template>
```

### Without input elements

```vue
<script setup lang="ts">
import { useSwitch, SwitchFieldProps } from '@formwerk/core';

const props = defineProps<SwitchFieldProps>();

const { switchProps, labelProps, isPressed } = useSwitch(props);
</script>

<template>
  <div class="flex items-center">
    <div
      v-bind="switchProps"
      class="flex items-center p-1 w-9 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus:ring-2 ring-blue-500 ring-offset-2"
      :class="{ 'bg-blue-500': isPressed, 'bg-gray-400': !isPressed }"
    >
      <div
        class="rounded-full w-3 h-3 flex-shrink-0 bg-white origin-center transition-transform duration-200"
        :class="{ 'translate-x-4': isPressed }"
      ></div>
    </div>

    <label class="ml-2" v-bind="labelProps">{{ label }}</label>
  </div>
</template>
```
