import { Temporal } from '@js-temporal/polyfill';
import { MaybeRefOrGetter } from 'vue';
import { WeekInfo } from '../i18n/getWeekInfo';
import { Ref } from 'vue';
import { Maybe } from '../types';

export type CalendarIdentifier =
  | 'buddhist'
  | 'chinese'
  | 'coptic'
  | 'dangi'
  | 'ethioaa'
  | 'ethiopic'
  | 'gregory'
  | 'hebrew'
  | 'indian'
  | 'islamic'
  | 'islamic-umalqura'
  | 'islamic-tbla'
  | 'islamic-civil'
  | 'islamic-rgsa'
  | 'iso8601'
  | 'japanese'
  | 'persian'
  | 'roc';

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

export type CalendarPanelType = 'day' | 'month' | 'year';

export interface CalendarContext {
  locale: Ref<string>;
  weekInfo: Ref<WeekInfo>;
  calendar: Ref<CalendarIdentifier>;
  selectedDate: MaybeRefOrGetter<Temporal.ZonedDateTime>;
  getMinDate: () => Maybe<Temporal.ZonedDateTime>;
  getMaxDate: () => Maybe<Temporal.ZonedDateTime>;
  getFocusedDate: () => Temporal.ZonedDateTime;
  setFocusedDate: (date: Temporal.ZonedDateTime) => void;
  setDate: (date: Temporal.ZonedDateTime, panel?: CalendarPanelType) => void;
}
