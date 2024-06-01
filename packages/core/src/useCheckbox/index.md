# Checkbox

Checkboxes allow the user to make a binary choice, i.e. a choice between one of two possible mutually exclusive options. Unlike Radios, checkboxes can used on their own. For example, agreeing to the terms and conditions or subscribing to a newsletter. But checkboxes are more nuanced than that.

They can also be used to represent options from a list of options, in this situation they are considered a group and multiple checkboxes can be selected at once.

Also checkboxes do not just have a binary choice, they can also have a "mixed" or "indeterminate" state. This is useful for representing a group of checkboxes as a while having some, none or all of the checkboxes selected. This is also known as being "partially checked".

[Aria Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)

## Features

You can build checkboxes using either the native HTML `input[type="checkbox"]` elements or custom elements. We provide the behavior, state and accessibility implementation for both cases.

- Keyboard focus management.
- Aria attributes are automatically added to the radio group and radio fields.
- Pressing <kbd>Space</kbd> to toggle the checkbox checked state.
- Errors and validation.
- Support for `indeterminate` state and tri-state checkboxes.

You can also build checkbox groups, in a similar manner to radio groups.

## useCheckbox

Provides the behavior, state and accessibility implementation for checkbox items. Checkbox items can be built with or without `input` elements depending on your styling and behavior needs.

### With input elements

This is how you would build a custom checkbox item component using the `useCheckbox` composable.

```vue
<script setup lang="ts">
import { CheckboxProps, useCheckbox } from '@formwerk/core';

const props = defineProps<CheckboxProps>();

const { labelProps, inputProps } = useCheckbox(props);
</script>

<template>
  <div class="flex items-center">
    <input v-bind="inputProps" />

    <label v-bind="labelProps" class="ml-1">{{ label }}</label>
  </div>
</template>
```

### Without input elements

For special styling needs, you don't have to use the `input` element. You will be using `checkboxProps` instead of `inputProps`.

```vue
<script setup lang="ts">
import { CheckboxProps, useCheckbox } from '@formwerk/core';

const props = defineProps<CheckboxProps>();

const { labelProps, checkboxProps, isChecked } = useCheckbox(props);
</script>

<template>
  <div v-bind="checkboxProps" class="flex items-center">
    <div
      class="w-5 h-5 rounded-md flex-shrink-0 border border-gray-600 flex items-center justify-center focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <div class="w-3 h-3 rounded-md flex-shrink-0" :class="{ 'bg-blue-500': isChecked }" />
    </div>

    <span v-bind="labelProps" class="ml-1">{{ label }}</span>
  </div>
</template>
```

## useCheckboxGroup

Provides the behavior, state and accessibility implementation for group components.

- A checkbox group can have a `v-model` bound to it.
- A checkbox group considers all children that call `useCheckbox` as one item of the group.

This is how you would build a custom checkbox group component using the `useCheckboxGroup` composable.

```vue
<script setup lang="ts">
import { CheckboxGroupProps, useCheckboxGroup } from '@formwerk/core';

const props = defineProps<CheckboxGroupProps>();

const { checkboxGroupProps, labelProps, descriptionProps, errorMessageProps, errorMessage } = useCheckboxGroup(props);
</script>

<template>
  <div
    v-bind="checkboxGroupProps"
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
