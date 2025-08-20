<script setup lang="ts">
import FormField from './components/FormField.vue';
import TextControl from './components/TextControl.vue';
</script>

<template>
  <FormField label="Name">
    <TextControl required />
  </FormField>
</template>

<style>
button:disabled {
  @apply cursor-not-allowed opacity-50;
}
</style>
