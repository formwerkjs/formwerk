<script setup lang="ts">
import OtpField from '@/components/OtpField.vue';
</script>

<template>
  <OtpField name="otp" label="OTP" :length="4" accept="numeric" prefix="G-" required masked />
</template>
