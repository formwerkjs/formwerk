<script setup lang="ts">
import { type RadioGroupProps, useRadioGroup } from '@formwerk/core';

const props = defineProps<RadioGroupProps>();

const { groupProps, labelProps, descriptionProps, errorMessageProps, errorMessage } = useRadioGroup(props);
</script>

<template>
  <div v-bind="groupProps" class="radio-group">
    <div v-bind="labelProps" class="group-label">{{ label }}</div>

    <div class="radios-container">
      <slot />
    </div>

    <div v-if="errorMessage" v-bind="errorMessageProps" class="error">
      {{ errorMessage }}
    </div>

    <div v-else-if="description" v-bind="descriptionProps" class="hint">
      {{ description }}
    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.radio-group {
  display: flex;
  flex-direction: column;

  font-family: 'Monaspace Neon Var';
  @apply relative w-full;
  margin-bottom: calc(1em * 1.5);

  .group-label {
    @apply block mb-1 w-full font-semibold text-lg text-white;
  }

  .error {
    color: var(--color-error);
    font-size: 13px;
  }

  .radios-container {
    margin-top: 0.25rem;
    @apply flex flex-col gap-1;
  }
}
</style>
