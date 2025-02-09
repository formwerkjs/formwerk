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

const {
  pickerProps,
  gridProps,
  buttonProps,
  nextMonthButtonProps,
  previousMonthButtonProps,
  monthYearLabelProps: calendarLabelProps,
  monthYearLabel,
  currentPanel,
} = useCalendar(calendarProps);
</script>

<template>
  <div class="InputDate" :class="{ touched: isTouched }" :dir="direction">
    <span class="label" v-bind="labelProps">{{ label }}</span>

    {{ fieldValue }}

    <div class="flex items-center gap-1 control">
      <div v-bind="controlProps">
        <DateTimeSegment v-for="segment in segments" v-bind="segment" class="segment" />
      </div>

      <button v-bind="buttonProps">📅</button>
    </div>

    <div popover class="bg-zinc-800 px-4 py-4" v-bind="pickerProps">
      <div class="flex items-center justify-between text-white my-4">
        <button v-bind="previousMonthButtonProps">⬆️</button>

        <span v-bind="calendarLabelProps">
          {{ monthYearLabel }}
        </span>

        <button v-bind="nextMonthButtonProps">⬇️</button>
      </div>

      <div class="gap-4" :dir="direction" v-bind="gridProps">
        <template v-if="currentPanel.type === 'day'">
          <div
            v-for="day in currentPanel.daysOfTheWeek"
            :key="day"
            class="flex flex-col items-center justify-center text-white font-bold"
          >
            {{ day }}
          </div>

          <CalendarCell
            v-for="day in currentPanel.days"
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
        </template>

        <template v-if="currentPanel.type === 'month'">
          <CalendarCell
            v-for="month in currentPanel.months"
            v-bind="month"
            class="flex flex-col items-center justify-center aria-selected:bg-emerald-600 aria-selected:text-white aria-selected:font-medium border-2 focus:border-emerald-600 focus:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            {{ month.label }}
          </CalendarCell>
        </template>

        <template v-if="currentPanel.type === 'year'">
          <CalendarCell
            v-for="year in currentPanel.years"
            v-bind="year"
            class="flex flex-col items-center justify-center aria-selected:bg-emerald-600 aria-selected:text-white aria-selected:font-medium border-2 focus:border-emerald-600 focus:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            {{ year.label }}
          </CalendarCell>
        </template>
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
    @apply p-0.5 rounded focus:outline-none focus:bg-blue-600 caret-transparent;
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
