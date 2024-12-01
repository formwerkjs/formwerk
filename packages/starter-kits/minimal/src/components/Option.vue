<script setup lang="ts" generic="TValue">
import { useOption, type OptionProps } from '@formwerk/core';

const props = defineProps<OptionProps<TValue>>();

const { optionProps } = useOption(props);
</script>

<template>
  <div class="option" v-bind="optionProps">
    {{ label }}
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.option {
  padding: 4px 8px;
  border-radius: 4px;

  &:focus {
    border: 1px solid #000;
  }

  &[aria-selected='true'],
  &[aria-checked='true'] {
    background-color: #000;
    color: #fff;
  }
}
</style>
