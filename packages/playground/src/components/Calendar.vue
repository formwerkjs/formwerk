<script setup lang="ts">
import { useCalendar, type CalendarProps, CalendarCell } from '@formwerk/core';

const props = defineProps<CalendarProps>();

const {
  calendarProps,
  gridProps,
  nextButtonProps,
  previousButtonProps,
  gridLabelProps,
  gridLabel,
  currentView,
  errorMessage,
} = useCalendar(props);
</script>

<template>
  <div class="bg-zinc-800 px-4 py-4" v-bind="calendarProps">
    <div class="flex items-center justify-between text-white my-4">
      <button v-bind="previousButtonProps">⬆️</button>

      <span v-bind="gridLabelProps">
        {{ gridLabel }}
      </span>

      <button v-bind="nextButtonProps">⬇️</button>
    </div>

    <div v-if="currentView.type === 'weeks'" v-bind="gridProps" class="grid grid-cols-7 gap-4">
      <div
        v-for="day in currentView.weekDays"
        :key="day"
        class="flex flex-col items-center justify-center text-white font-bold"
      >
        {{ day }}
      </div>

      <CalendarCell
        v-for="day in currentView.days"
        v-bind="day"
        class="flex flex-col items-center justify-center aria-selected:bg-emerald-600 aria-selected:text-white aria-selected:font-medium border-2 focus:border-emerald-600 focus:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        :class="{
          'text-zinc-500': day.isOutsideMonth,
          'text-white': !day.isOutsideMonth,
          'border-transparent': !day.isToday,
          'border-emerald-600': day.isToday,
        }"
      >
        {{ day.label }}
      </CalendarCell>
    </div>

    <div v-if="currentView.type === 'months'" v-bind="gridProps" class="grid grid-cols-4 gap-4">
      <CalendarCell
        v-for="month in currentView.months"
        v-bind="month"
        class="flex flex-col items-center justify-center aria-selected:bg-emerald-600 aria-selected:text-white aria-selected:font-medium border-2 focus:border-emerald-600 focus:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      >
        {{ month.label }}
      </CalendarCell>
    </div>

    <div v-if="currentView.type === 'years'" v-bind="gridProps" class="grid grid-cols-4 gap-4">
      <CalendarCell
        v-for="year in currentView.years"
        v-bind="year"
        class="flex flex-col items-center justify-center aria-selected:bg-emerald-600 aria-selected:text-white aria-selected:font-medium border-2 focus:border-emerald-600 focus:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      >
        {{ year.label }}
      </CalendarCell>
    </div>

    {{ errorMessage }}
  </div>
</template>
