<script setup lang="ts">
import DateField from '@/components/DateField.vue';
import Calendar from './components/Calendar.vue';
// import { createCalendar } from '@internationalized/date';

const minDate = new Date(2025, 1, 14, 0, 0, 0, 0);
const maxDate = new Date(2025, 1, 18, 0, 0, 0, 0);
</script>

<template>
  <div class="flex flex-col gap-4">
    <DateField
      name="date"
      label="Date"
      :format-options="{
        day: '2-digit',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        hour12: true,
        minute: '2-digit',
        second: '2-digit',
      }"
    />
  </div>
</template>
