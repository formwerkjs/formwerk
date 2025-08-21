<script setup lang="ts">
import { ref } from 'vue';
import FormField from './components/FormField.vue';
import TextControl from './components/TextControl.vue';

const validationOn = ref(['test']);
</script>

<template>
  <FormField label="Name">
    <TextControl required :validate-on="validationOn" />

    <button @click="validationOn.push('blur')">Add blur</button>
    {{ validationOn }}
  </FormField>
</template>

<style>
button:disabled {
  @apply cursor-not-allowed opacity-50;
}
</style>
