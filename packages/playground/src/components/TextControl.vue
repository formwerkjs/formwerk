<script setup lang="ts">
import { TextControlProps, useTextControl } from '@formwerk/core';

const props = defineProps<TextControlProps>();

const { inputProps } = useTextControl(props);
</script>

<template>
  <input v-bind="inputProps" class="border border-gray-300 rounded-md p-2" />
</template>
