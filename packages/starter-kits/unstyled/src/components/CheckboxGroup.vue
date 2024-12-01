<script setup lang="ts" generic="TCheckboxValue, TCheckboxOption extends { label: string; value: TCheckboxValue }">
import { useCheckboxGroup, type CheckboxGroupProps } from '@formwerk/core';
import Checkbox from './Checkbox.vue';

interface Props extends CheckboxGroupProps<TCheckboxValue> {
  options?: TCheckboxOption[];
}

const props = defineProps<Props>();

const { groupProps, labelProps, errorMessage, errorMessageProps, descriptionProps } = useCheckboxGroup(props);
</script>

<template>
  <div v-bind="groupProps" class="checkbox-group">
    <p v-bind="labelProps">{{ label }}</p>

    <!-- You can either pass options as a prop or use the slot and inline the Checkbox component -->
    <div class="checkbox-group-options">
      <slot v-if="!options" />

      <template v-else>
        <Checkbox v-for="option in options" :key="option.label" :label="option.label" :value="option.value" />
      </template>
    </div>

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="description" v-bind="descriptionProps">{{ description }}</p>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-group-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-message {
  color: red;
}
</style>
