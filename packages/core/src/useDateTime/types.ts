import { Temporal } from 'temporal-polyfill';
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

export type DateValue = Date | Temporal.ZonedDateTime;

export type TemporalPartial = Temporal.ZonedDateTime & {
  [`~fw_temporal_partial`]: {
    [key: string]: boolean | undefined;
  };
};
