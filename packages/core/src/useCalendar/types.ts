import { WeekInfo } from '../i18n/getWeekInfo';
import { Ref } from 'vue';
import { Maybe } from '../types';
import type { ZonedDateTime, Calendar } from '@internationalized/date';

export interface CalendarDayCell {
  type: 'day';
  value: ZonedDateTime;
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
  value: ZonedDateTime;
  monthOfYear: number;
  selected: boolean;
  disabled: boolean;
  focused: boolean;
}

export interface CalendarYearCell {
  type: 'year';
  label: string;
  value: ZonedDateTime;
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
  calendar: Ref<Calendar>;
  getSelectedDate: () => ZonedDateTime;
  getMinDate: () => Maybe<ZonedDateTime>;
  getMaxDate: () => Maybe<ZonedDateTime>;
  getFocusedDate: () => ZonedDateTime;
  setFocusedDate: (date: ZonedDateTime) => void;
  setDate: (date: ZonedDateTime, panel?: CalendarPanelType) => void;
}
