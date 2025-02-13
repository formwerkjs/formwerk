import { ZonedDateTime } from '@internationalized/date';

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

export type DateValue = Date | ZonedDateTime;

export type TemporalPartial = ZonedDateTime & {
  [`~fw_temporal_partial`]: {
    [key: string]: boolean | undefined;
  };
};
