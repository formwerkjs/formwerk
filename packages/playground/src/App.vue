<script setup lang="ts">
import { ref } from 'vue';
import FormField from './components/FormField.vue';
import TextControl from './components/TextControl.vue';
import InputSelect from './components/InputSelect.vue';
import OptionItem from './components/OptionItem.vue';

const validationOn = ref(['test']);
</script>

<template>
  <InputSelect label="Select">
    <OptionItem label="Option 1" value="option1" />
    <OptionItem label="Option 2" value="option2" />
    <OptionItem label="Option 3" value="option3" />
  </InputSelect>
</template>

<style>
button:disabled {
  @apply cursor-not-allowed opacity-50;
}
</style>
