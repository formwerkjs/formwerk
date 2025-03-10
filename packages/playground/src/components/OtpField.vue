<template>
  <div class="OTP">
    <div class="label" v-bind="labelProps">{{ label }}</div>

    <div class="control" v-bind="controlProps">
      <OtpSlot v-for="slot in fieldSlots" v-bind="slot" />
    </div>

    <span v-bind="errorMessageProps" class="w-full truncate error-message">
      {{ errorMessage }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useOtpField, OTPFieldProps, OtpSlot } from '@formwerk/core';

const props = defineProps<OTPFieldProps>();

const { controlProps, labelProps, errorMessage, errorMessageProps, fieldSlots } = useOtpField(props);
</script>

<style scoped>
@reference "../style.css";

.OTP {
  @apply flex flex-col gap-2;

  .label {
    @apply text-lg font-semibold text-white;
  }

  [data-otp-slot] {
    @apply w-10 h-10 rounded-md border-2 border-zinc-700 bg-zinc-800 text-white font-medium text-2xl text-center;

    &[aria-disabled='true'] {
      @apply bg-zinc-700 opacity-50;
    }
  }

  .control {
    @apply flex gap-2;
  }
}
</style>
