<script setup lang="ts" generic="TRadioValue, TRadioOption extends { label: string; value: TRadioValue }">
import { useRadioGroup, type RadioGroupProps } from '@formwerk/core';
import Radio from './Radio.vue';

interface Props extends RadioGroupProps<TRadioValue> {
  options?: TRadioOption[];
}

const props = defineProps<Props>();

const { groupProps, labelProps, errorMessage, errorMessageProps, descriptionProps } = useRadioGroup(props);
</script>

<template>
  <div v-bind="groupProps" class="radio-group">
    <p v-bind="labelProps">{{ label }}</p>

    <!-- You can either pass options as a prop or use the slot and inline the Radio component -->
    <div class="radio-group-options">
      <slot v-if="!options" />

      <template v-else>
        <Radio v-for="option in options" :key="option.label" :label="option.label" :value="option.value" />
      </template>
    </div>

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="description" v-bind="descriptionProps">{{ description }}</p>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-message {
  color: red;
}
</style>
