<script setup lang="ts">
import { useDateTimeField, DateTimeFieldProps, DateTimeSegment, useCalendar, CalendarCell } from '@formwerk/core';

const props = defineProps<DateTimeFieldProps>();

const {
  controlProps,
  isTouched,
  labelProps,
  errorMessageProps,
  errorMessage,
  segments,
  fieldValue,
  calendarProps,
  direction,
} = useDateTimeField(props);

const { days, daysOfTheWeek } = useCalendar(calendarProps);
</script>

<template>
  <div class="InputDate" :class="{ touched: isTouched }" :dir="direction">
    <span class="label" v-bind="labelProps">{{ label }}</span>

    {{ fieldValue }}

    <div class="flex items-center gap-1 control">
      <div v-bind="controlProps">
        <DateTimeSegment v-for="segment in segments" v-bind="segment" class="segment" />
      </div>

      <button type="button" popovertarget="calendar">📅</button>
    </div>

    <div id="calendar" popover class="bg-zinc-800 px-4 py-4">
      <div class="grid grid-cols-7 gap-4" :dir="direction">
        <div
          v-for="day in daysOfTheWeek"
          :key="day.long"
          class="flex flex-col items-center justify-center text-white font-bold"
        >
          {{ day.short }}
        </div>

        <CalendarCell
          v-for="day in days"
          v-bind="day"
          :aria-checked="day.isSelected"
          class="flex flex-col items-center justify-center aria-checked:bg-emerald-600 aria-checked:text-white aria-checked:font-medium border-2"
          :class="{
            'text-zinc-500': day.isOutsideMonth,
            'text-white': !day.isOutsideMonth,
            'border-transparent': !day.isToday,
            'border-emerald-600': day.isToday,
          }"
        >
          {{ day.dayOfMonth }}
        </CalendarCell>
      </div>
    </div>

    <span v-bind="errorMessageProps" class="w-full truncate error-message">
      {{ errorMessage }}
    </span>
  </div>
</template>

<style scoped lang="postcss">
.InputDate {
  font-family: 'Monaspace Neon Var';
  @apply relative w-full;
  margin-bottom: calc(1em * 1.5);

  .label {
    @apply block mb-1 w-full font-semibold text-lg text-white;
  }

  .control {
    @apply max-w-lg rounded-md border-2 border-transparent py-3 px-4 w-full bg-zinc-800 focus:bg-zinc-900 focus:outline-none transition-colors duration-200 focus:border-emerald-500 disabled:cursor-not-allowed text-white font-medium;
  }

  .segment {
    @apply p-0.5 rounded focus:outline-none focus:bg-blue-600;
  }

  .error-message {
    @apply absolute left-0 text-sm text-red-500 font-medium;
    bottom: calc(-1.8 * 1em);
  }

  &:has(:user-invalid),
  &:has(.error-message:not(:empty)) {
    input {
      @apply border-red-500;
    }
  }

  &:has(:disabled) {
    input {
      @apply bg-gray-200 cursor-not-allowed;
    }
  }
}
</style>
