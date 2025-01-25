<script setup lang="ts">
import { Temporal } from '@js-temporal/polyfill';
import { useCalendar } from '@formwerk/core';
import DateField from '@/components/DateField.vue';

const { days, daysOfTheWeek } = useCalendar();
</script>

<template>
  <div class="flex flex-col w-1/2 gap-4">
    <div class="grid grid-cols-7">
      <div v-for="day in daysOfTheWeek" :key="day.long" class="flex flex-col items-center justify-center">
        {{ day.short }}
      </div>

      <div
        v-for="day in days"
        :key="day.dayOfMonth"
        :aria-checked="day.isToday"
        class="flex flex-col items-center justify-center aria-checked:bg-blue-600 aria-checked:text-white aria-checked:font-medium"
        :class="{
          'text-zinc-500': day.isOutsideMonth,
        }"
      >
        {{ day.dayOfMonth }}
      </div>
    </div>

    <DateField
      name="date"
      label="Date"
      :format-options="{
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }"
    />
  </div>
</template>
