<script setup lang="ts">
import DateField from '@/components/DateField.vue';
import Calendar from '@/components/Calendar.vue';

// You need to be careful with the time component of the date object.
// JS date objects fills the date time with the current time component.
const min = new Date(2025, 0, 4, 0, 0, 0, 0);
const value = new Date('2025-01-15');
const max = new Date('2025-01-20');
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- <DateField
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
    /> -->

    <Calendar label="Calendar" :value="value" readonly />
  </div>
</template>
