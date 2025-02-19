<script setup lang="ts">
import DateField from '@/components/DateField.vue';
import Calendar from '@/components/Calendar.vue';
import { createCalendar, IslamicUmalquraCalendar } from '@internationalized/date';
const calendar = createCalendar('islamic-umalqura');

// You need to be careful with the time component of the date object.
// JS date objects fills the date time with the current time component.
const min = new Date(2025, 0, 4, 0, 0, 0, 0);
const value = new Date('2025-01-15');
const max = new Date('2025-01-20');
</script>

<template>
  <div class="flex flex-col gap-4">
    <DateField label="Hijri Date" :value="new Date('2025-02-11')" :calendar="calendar" locale="ar-EG" />
  </div>
</template>
