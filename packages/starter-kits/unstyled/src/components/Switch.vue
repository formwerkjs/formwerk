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
  }

  .switch-indicator-knob {
    width: 16px;
    height: 16px;
  }

  &:has(:checked) {
    .switch-indicator-knob {
      transform: translateX(20px);
    }
  }
}

.error-message {
  color: red;
}
</style>
