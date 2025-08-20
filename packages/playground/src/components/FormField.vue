<template>
  <div>
    <label v-bind="labelProps">{{ label }}</label>

    <slot />

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>

    <p v-else-if="description" v-bind="descriptionProps">{{ description }}</p>

    {{ fieldValue }}
  </div>
</template>

<script setup lang="ts">
import { useFieldState, useFormField, FieldProps } from '@formwerk/core';

const props = defineProps<FieldProps>();

const state = useFieldState();
const { errorMessage, fieldValue } = state;
const { labelProps, errorMessageProps, descriptionProps } = useFormField(props, state);
</script>

<style scoped>
/** Your styles here */
.error-message {
  color: red;
}

label {
  display: block;
}
</style>
