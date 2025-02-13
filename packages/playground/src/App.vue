<script setup lang="ts">
import DateField from '@/components/DateField.vue';
import { createCalendar } from '@internationalized/date';

const minDate = new Date('2025-01-01');
const maxDate = new Date('2025-01-31');
</script>

<template>
  <div class="flex flex-col w-1/2 gap-4">
    <DateField
      name="date"
      label="Date"
      :calendar="createCalendar('islamic-umalqura')"
      :format-options="{
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        hour12: true,
        minute: '2-digit',
        second: '2-digit',
      }"
    />
  </div>
</template>
