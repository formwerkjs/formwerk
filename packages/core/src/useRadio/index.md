# Radio

> A radio group is a set of checkable buttons, known as radio buttons, where no more than one of the buttons can be checked at a time. Some implementations may initialize the set with all buttons in the unchecked state in order to force the user to check one of the buttons before moving past a certain point in the workflow.

Radios in HTML do not have a "group" concept, but they get grouped implicitly by the "name" attribute. This isn't the case in Vue, as they are grouped by the model name they mutate. As such, a "group" concept is introduced in this library to provide a consistent API for radio groups regardless if they are bound to the same model or if they have the same name or not.

[Aria Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)

## Features

You can build radio groups using either native HTML `input[type="radio"]` elements or custom elements. We help provide the behavior, state and accessibility implementation for both cases.

- Keyboard focus management with arrow keys and tabs that respects the native behavior with RTL support.
- Aria attributes are automatically added to the radio group and radio fields.
- Labeling and descriptions are automatically linked to the radio fields and groups.

## useRadioGroup

Provides the behavior, state and accessibility implementation for group components.

- A radio group can have a `v-model` bound to it.
- A radio group considers all children that call `useRadioItem` as one item of the group.

This is how you would build a custom radio group component using the `useRadioGroup` composable.

```vue
<script setup lang="ts">
import { RadioGroupProps, useRadioGroup } from '@formwerk/core';

const props = defineProps<RadioGroupProps>();

const { radioGroupProps, labelProps, descriptionProps, errorMessageProps, errorMessage } = useRadioGroup(props);
</script>

<template>
  <div
    v-bind="radioGroupProps"
    class="flex border border-gray-200 rounded-md p-2"
    :class="{ 'flex-col': orientation !== 'horizontal' }"
  >
    <span
      v-bind="labelProps"
      class="font-medium"
      :class="{ 'mr-4': orientation === 'horizontal', 'mb-4': orientation !== 'horizontal' }"
      >{{ label }}</span
    >

    <slot />

    <div v-if="errorMessageProps" v-bind="errorMessageProps" class="text-red-500 text-xs">{{ errorMessage }}</div>

    <div v-else-if="description" v-bind="descriptionProps" class="text-gray-500 text-xs">{{ description }}</div>
  </div>
</template>
```

## useRadioItem

Provides the behavior, state and accessibility implementation for radio items. Radio items can be built with or without `input` elements depending on your styling and behavior needs.

### With input elements (recommended)

This is how you would build a custom radio item component using the `useRadioItem` composable.

```vue
<script setup lang="ts">
import { RadioItemProps, useRadioItem } from '@formwerk/core';

const props = defineProps<RadioItemProps>();

const { labelProps, inputProps } = useRadioItem(props);
</script>

<template>
  <div class="flex items-center">
    <input v-bind="inputProps" />

    <label v-bind="labelProps" class="ml-1">{{ label }}</label>
  </div>
</template>
```

### Without input elements

For special styling needs, you don't have to use the `input` element. You will be using `radioProps` instead of `inputProps`.

```vue
<script setup lang="ts">
import { RadioItemProps, useRadioItem } from '@formwerk/core';

const props = defineProps<RadioItemProps>();

const { labelProps, radioProps, isChecked } = useRadioItem(props);
</script>

<template>
  <div class="flex items-center">
    <div
      v-bind="radioProps"
      class="w-5 h-5 rounded-full flex-shrink-0 border border-gray-600 flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <div class="w-3 h-3 rounded-full flex-shrink-0" :class="{ 'bg-blue-500': isChecked }" />
    </div>

    <label v-bind="labelProps" class="ml-1">{{ label }}</label>
  </div>
</template>
```
