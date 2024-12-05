<script setup lang="ts">
import { useSwitch, type SwitchProps } from '@formwerk/core';

const props = defineProps<SwitchProps>();

const { inputProps, labelProps, errorMessage, errorMessageProps } = useSwitch(props);
</script>

<template>
  <div class="field switch">
    <label v-bind="labelProps">
      <input v-bind="inputProps" class="sr-only" />
      {{ label }}

      <div class="switch-indicator">
        <div class="switch-indicator-knob"></div>
      </div>
    </label>

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
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

/** Your styles here, feel free to override any of this */
.switch {
  .switch-indicator {
    width: 40px;
    height: 20px;
    border: 1px solid #000;
    border-radius: 10px;
    background-color: gray;
    display: flex;
    align-items: center;
  }

  label {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .switch-indicator-knob {
    width: 16px;
    height: 16px;
    background-color: #fff;
    border-radius: 99999999px;
  }

  &:has(:checked) {
    .switch-indicator {
      background-color: #000;
    }

    .switch-indicator-knob {
      transform: translateX(20px);
    }
  }
}

.error-message {
  color: red;
}
</style>
