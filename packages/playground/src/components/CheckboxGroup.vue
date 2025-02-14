<script setup lang="ts">
import { type CheckboxGroupProps, useCheckboxGroup } from '@formwerk/core';

const props = defineProps<CheckboxGroupProps>();

const { groupProps, labelProps, descriptionProps, errorMessageProps, errorMessage } = useCheckboxGroup(props);
</script>

<template>
  <div v-bind="groupProps" class="checkbox-group">
    <div v-bind="labelProps" class="group-label">{{ label }}</div>

    <div class="checkboxes-container">
      <slot />
    </div>

    <div v-if="errorMessage" v-bind="errorMessageProps" class="error">
      {{ errorMessage }}
    </div>

    <div v-if="description" v-bind="descriptionProps" class="hint">
      {{ description }}
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.checkbox-group {
  font-family: 'Monaspace Neon Var';
  display: flex;
  flex-direction: column;
  @apply relative w-full;
  margin-bottom: calc(1em * 1.5);

  .group-label {
    @apply block mb-1 w-full font-semibold text-lg text-white;
  }

  .checkboxes-container {
    margin-top: 0.25rem;
    @apply flex flex-col gap-1;
  }
}
</style>
