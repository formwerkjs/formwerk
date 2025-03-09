<script setup lang="ts">
import OtpField from '@/components/OtpField.vue';
import { useForm } from '@formwerk/core';
const form = useForm();

function onCompleted(value: string) {
  alert(`onCompleted: ${value}`);
}
</script>

<template>
  <OtpField name="otp" label="OTP" accept="numeric" :length="4" prefix="G-" masked @completed="onCompleted" />

  <div class="flex w-full">
    <button @click="form.setValue('otp', 'G-4321')">Set OTP</button>
  </div>
</template>
