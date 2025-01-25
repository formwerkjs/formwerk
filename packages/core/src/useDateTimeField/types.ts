import type { Temporal } from '@js-temporal/polyfill';

/**
 * lib.es2017.intl.d.ts
 */
export type DateTimeSegmentType =
  | 'day'
  | 'dayPeriod'
  | 'era'
  | 'hour'
  | 'literal'
  | 'minute'
  | 'month'
  | 'second'
  | 'timeZoneName'
  | 'weekday'
  | 'year';

export type TemporalDate =
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.PlainTime
  | Temporal.PlainYearMonth
  | Temporal.ZonedDateTime;

export type DateValue = Date | TemporalDate;

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
