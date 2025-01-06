<template>
  <div>
    <div v-bind="labelProps">{{ label }}</div>

    <div v-bind="controlProps">
      <button type="button" @click="onJa">Ja</button>
      <button type="button" @click="onNein">Nein</button>
    </div>

    <div v-bind="errorMessageProps">{{ errorMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { useCustomField, type CustomFieldProps } from '@formwerk/core';

const props = defineProps<CustomFieldProps>();

const { controlProps, labelProps, errorMessage, errorMessageProps, setValue } = useCustomField<'ja' | 'nein'>({
  label: 'Custom Field',
  name: () => props.name,
});

function onJa() {
  setValue('ja');
}

function onNein() {
  setValue('nein');
}
</script>
