<script setup lang="ts">
import OtpField from '@/components/OtpField.vue';
import { useForm } from '@formwerk/core';
const form = useForm();

function onCompleted(value: string) {
  console.log('onCompleted', value);
}
</script>

<template>
  <OtpField name="otp" label="OTP" :length="4" accept="numeric" prefix="G-" required @completed="onCompleted" />
  <button @click="form.setValue('otp', 'G-4321')">Set OTP</button>
</template>
