<script setup lang="ts">
import { useSearchField, type SearchFieldProps } from '@formwerk/core';

const props = defineProps<SearchFieldProps>();

const { inputProps, labelProps, errorMessage, errorMessageProps, descriptionProps, clearBtnProps } =
  useSearchField(props);
</script>

<template>
  <div>
    <label v-bind="labelProps">{{ label }}</label>

    <div>
      <input v-bind="inputProps" />
      <button v-bind="clearBtnProps">{{ clearButtonLabel || 'Clear' }}</button>
    </div>

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="description" v-bind="descriptionProps">{{ description }}</p>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.error-message {
  color: red;
}
</style>
