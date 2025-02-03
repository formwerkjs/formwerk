import { Temporal } from '@js-temporal/polyfill';

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

export interface CalendarDay {
  value: Temporal.ZonedDateTime;

  dayOfMonth: number;

  isToday: boolean;

  isOutsideMonth: boolean;

  selected: boolean;

  disabled: boolean;

  focused: boolean;
}
