<script setup lang="ts">
import DateField from '@/components/DateField.vue';
import Calendar from './components/Calendar.vue';
// import { createCalendar } from '@internationalized/date';

const minDate = new Date('2025-02-14');
const maxDate = new Date('2025-02-18');
</script>

<template>
  <div class="flex flex-col gap-4">
    <DateField
      name="date"
      label="Date"
      :min="minDate"
      :max="maxDate"
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

    <Calendar name="date" label="select a date" :min="minDate" :max="maxDate" />
  </div>
</template>
