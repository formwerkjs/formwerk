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
