<script setup lang="ts">
import { RadioItemProps, useRadioItem } from '@formwerk/core';

const props = defineProps<RadioItemProps>();

const { labelProps, inputRef, inputProps } = useRadioItem(props);
</script>

<template>
  <div class="flex items-center">
    <input ref="inputRef" v-bind="inputProps" />

    <label v-bind="labelProps" class="ml-1">{{ label }}</label>
  </div>
</template>
