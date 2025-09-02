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
import { useFormField, FormFieldProps } from '@formwerk/core';

const props = defineProps<FormFieldProps>();

const field = useFormField();
const { labelProps, errorMessageProps, descriptionProps } = field;
const { errorMessage, fieldValue } = field;
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
