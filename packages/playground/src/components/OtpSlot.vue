<script setup lang="ts">
import { OtpSlotProps, useOtpSlot } from '@formwerk/core';

const props = defineProps<OtpSlotProps>();

const { slotProps } = useOtpSlot(props);
</script>

<template>
  <input v-bind="slotProps" class="otp-slot" />
</template>

<style scoped>
@reference "../style.css";

.otp-slot {
  @apply w-10 h-10 rounded-md border-2 border-zinc-700 bg-red-500 text-white font-medium text-2xl text-center;

  &:disabled {
    @apply bg-zinc-700 opacity-50;
  }
}
</style>
