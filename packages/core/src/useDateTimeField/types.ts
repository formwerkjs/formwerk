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

export type TemporalValue =
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.PlainTime
  | Temporal.PlainYearMonth
  | Temporal.ZonedDateTime;

export type DateValue = Date | TemporalValue;

export type TemporalPartial = Temporal.ZonedDateTime & {
  [`~fw_temporal_partial`]: {
    [key: string]: boolean | undefined;
  };
};
