<script setup lang="ts">
import ComboBox from './components/ComboBox.vue';
import OptionItem from './components/OptionItem.vue';
</script>

<template>
  <ComboBox label="test">
    <OptionItem label="TEST" value="1" />
    <OptionItem label="TEST2" value="2" />
  </ComboBox>
</template>

<style>
button:disabled {
  @apply cursor-not-allowed opacity-50;
}
</style>
