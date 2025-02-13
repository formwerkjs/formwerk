<script setup lang="ts">
import DateField from '@/components/DateField.vue';
// import { createCalendar } from '@internationalized/date';

const today = new Date();
const minDate = new Date('2025-01-01');
const maxDate = new Date('2025-01-31');
</script>

<template>
  <div class="flex flex-col w-1/2 gap-4">
    <DateField
      name="date"
      label="Date"
      :value="today"
      locale="ar"
      :format-options="{
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        hour12: true,
        minute: '2-digit',
        second: '2-digit',
      }"
    />
  </div>
</template>
