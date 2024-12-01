<script setup lang="ts">
import { useNumberField, type NumberFieldProps } from '@formwerk/core';

const props = defineProps<NumberFieldProps>();

const {
  inputProps,
  labelProps,
  errorMessage,
  errorMessageProps,
  descriptionProps,
  incrementButtonProps,
  decrementButtonProps,
} = useNumberField(props);
</script>

<template>
  <div class="field">
    <label v-bind="labelProps">{{ label }}</label>

    <div>
      <button v-bind="decrementButtonProps">-</button>
      <input v-bind="inputProps" />
      <button v-bind="incrementButtonProps">+</button>
    </div>

    <p v-if="errorMessage" v-bind="errorMessageProps">{{ errorMessage }}</p>

    <p v-else-if="description" v-bind="descriptionProps">{{ description }}</p>
  </div>
</template>

<style scoped>
/** Your styles here */
</style>
