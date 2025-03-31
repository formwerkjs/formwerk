import { WeekInfo } from '../i18n/getWeekInfo';
import { Ref } from 'vue';
import { Maybe } from '../types';
import { Temporal } from 'temporal-polyfill';

export interface CalendarDayCell {
  type: 'day';
  value: Temporal.ZonedDateTime;
  dayOfMonth: number;
  label: string;
  isToday: boolean;
  isOutsideMonth: boolean;
  selected: boolean;
  disabled: boolean;
  focused: boolean;
}

export interface CalendarMonthCell {
  type: 'month';
  label: string;
  value: Temporal.ZonedDateTime;
  monthOfYear: number;
  selected: boolean;
  disabled: boolean;
  focused: boolean;
}

export interface CalendarYearCell {
  type: 'year';
  label: string;
  value: Temporal.ZonedDateTime;
  year: number;
  selected: boolean;
  disabled: boolean;
  focused: boolean;
}

export type CalendarCellProps = CalendarDayCell | CalendarMonthCell | CalendarYearCell;

export type CalendarViewType = 'weeks' | 'months' | 'years';

export interface CalendarContext {
  locale: Ref<string>;
  weekInfo: Ref<WeekInfo>;
  calendar: Ref<string>;
  timeZone: Ref<string>;
  getSelectedDate: () => Temporal.ZonedDateTime;
  getMinDate: () => Maybe<Temporal.ZonedDateTime>;
  getMaxDate: () => Maybe<Temporal.ZonedDateTime>;
  getFocusedDate: () => Temporal.ZonedDateTime;
  setFocusedDate: (date: Temporal.ZonedDateTime) => void;
  setDate: (date: Temporal.ZonedDateTime, view?: CalendarViewType) => void;
}
