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

export type TemporalType = Temporal.ZonedDateTime | Temporal.PlainDateTime | Temporal.PlainDate | Temporal.PlainTime;

export type TemporalPartial<TTemp extends TemporalType = Temporal.ZonedDateTime> = TTemp & {
  [`~fw_temporal_partial`]: {
    [key: string]: boolean | undefined;
  };
};
