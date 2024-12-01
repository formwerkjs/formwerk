<script setup lang="ts" generic="TValue">
import { useCheckbox, type CheckboxProps } from '@formwerk/core';

const props = defineProps<CheckboxProps<TValue>>();

const { inputProps, labelProps, errorMessage, errorMessageProps, isGrouped } = useCheckbox(props);
</script>

<template>
  <div class="field checkbox">
    <label v-bind="labelProps">
      <input v-bind="inputProps" class="sr-only" />
      <div class="checkbox-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" fill="#000000" viewBox="0 0 256 256">
          <path
            d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z"
          ></path>
        </svg>
      </div>

      {{ label }}
    </label>

    <p v-if="!isGrouped && errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.checkbox {
  label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .checkbox-indicator {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 1px solid black;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 16px;
      height: 16px;
      display: none;
    }
  }

  &:has(:checked) {
    .checkbox-indicator svg {
      display: block;
    }
  }
}

.error-message {
  color: red;
}
</style>
