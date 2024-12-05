<script setup lang="ts" generic="TValue">
import { useRadio, type RadioProps } from '@formwerk/core';

const props = defineProps<RadioProps<TValue>>();

const { inputProps, labelProps } = useRadio(props);
</script>

<template>
  <div class="radio">
    <label v-bind="labelProps">
      <span class="radio-indicator">
        <span class="radio-indicator-inner" />
      </span>

      <input v-bind="inputProps" class="sr-only" />
      {{ label }}
    </label>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.radio {
  display: flex;
  align-items: center;
  gap: 8px;

  .radio-indicator {
    width: 16px;
    height: 16px;
    border-radius: 99999999;
    border: 1px solid #000;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;

    .radio-indicator-inner {
      display: none;
      width: 10px;
      height: 10px;
      border-radius: 99999999;
      background-color: #000;
    }
  }

  &:has(input:checked) .radio-indicator-inner {
    display: block;
  }
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
