import { MaybeRefOrGetter, computed, toValue } from 'vue';
import { CalendarIdentifier } from '../useCalendar';
import { DateValue } from './types';
import { toTemporalInstant } from '@js-temporal/polyfill';
import { Maybe } from '../types';
import { Temporal } from '@js-temporal/polyfill';
import { isNullOrUndefined } from '../utils/common';

interface TemporalValueStoreInit {
  model: {
    get: () => Maybe<Date>;
    set: (value: Maybe<Date>) => void;
  };
  locale: MaybeRefOrGetter<string>;
  timeZone: MaybeRefOrGetter<string>;
  calendar: MaybeRefOrGetter<CalendarIdentifier>;
}

export function useTemporalStore(init: TemporalValueStoreInit) {
  const model = init.model;

  function toZonedDateTime(value: Maybe<DateValue>): Temporal.ZonedDateTime {
    if (isNullOrUndefined(value)) {
      return Temporal.Now.zonedDateTime(toValue(init.calendar), toValue(init.timeZone));
    }

    if (value instanceof Date) {
      value = toTemporalInstant.call(value);
    }

    if (value instanceof Temporal.Instant) {
      return value.toZonedDateTime({
        timeZone: toValue(init.timeZone),
        calendar: toValue(init.calendar),
      });
    }

    if (value instanceof Temporal.PlainDate) {
      return value.toZonedDateTime({
        timeZone: toValue(init.timeZone),
      });
    }

    if (value instanceof Temporal.PlainDateTime) {
      return value.toZonedDateTime(toValue(init.timeZone));
    }

    if (value instanceof Temporal.PlainTime) {
      return value.toZonedDateTime({
        plainDate: Temporal.Now.plainDate(toValue(init.calendar)),
        timeZone: toValue(init.timeZone),
      });
    }

    if (value instanceof Temporal.PlainYearMonth) {
      return Temporal.Now.zonedDateTime(toValue(init.calendar), toValue(init.timeZone)).with({
        year: value.year,
        month: value.month,
      });
    }

    return value;
  }

  function toDate(value: Maybe<DateValue>): Date {
    if (isNullOrUndefined(value)) {
      return new Date();
    }

    if (value instanceof Date) {
      return value;
    }

    return new Date(toZonedDateTime(value).epochMilliseconds);
  }

  const temporalValue = computed({
    get: () => toZonedDateTime(model.get()),
    set: value => {
      model.set(toDate(value));
    },
  });

  return temporalValue;
}
