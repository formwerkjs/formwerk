<script setup lang="ts">
import { useTextField, type TextFieldProps } from '@formwerk/core';

const props = defineProps<TextFieldProps>();

const { inputProps, labelProps, errorMessage, errorMessageProps, descriptionProps } = useTextField(props);
</script>

<template>
  <div class="field">
    <label v-bind="labelProps">{{ label }}</label>
    <input v-bind="inputProps" />

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>

    <p v-else-if="description" v-bind="descriptionProps">{{ description }}</p>
  </div>
</template>

<style scoped>
/** Your styles here */
.error-message {
  color: red;
}

label {
  display: block;
}
</style>
