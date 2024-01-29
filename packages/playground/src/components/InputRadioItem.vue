<script setup lang="ts">
import { RadioFieldProps, useRadioField } from '@formwerk/core';

const props = defineProps<RadioFieldProps>();

const { labelProps, inputRef, inputProps } = useRadioField(props);
</script>

<template>
  <div class="flex items-center">
    <input ref="inputRef" v-bind="inputProps" />

    <label v-bind="labelProps" class="ml-1">{{ label }}</label>
  </div>
</template>
