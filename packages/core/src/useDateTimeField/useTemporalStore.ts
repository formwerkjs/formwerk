import { MaybeRefOrGetter, computed, shallowRef, toValue, watch } from 'vue';
import { CalendarIdentifier } from '../useCalendar';
import { DateValue, TemporalPartial } from './types';
import { toTemporalInstant } from '@js-temporal/polyfill';
import { Maybe } from '../types';
import { Temporal } from '@js-temporal/polyfill';
import { isNullOrUndefined } from '../utils/common';
import { createTemporalPartial, isTemporalPartial } from './temporalPartial';

interface TemporalValueStoreInit {
  model: {
    get: () => Maybe<Date>;
    set?: (value: Maybe<Date>) => void;
  };
  locale: MaybeRefOrGetter<string>;
  timeZone: MaybeRefOrGetter<string>;
  calendar: MaybeRefOrGetter<CalendarIdentifier>;
}

export function useTemporalStore(init: TemporalValueStoreInit) {
  const model = init.model;
  const temporalVal = shallowRef<Temporal.ZonedDateTime | TemporalPartial>(
    toZonedDateTime(model.get()) ?? createTemporalPartial(toValue(init.calendar), toValue(init.timeZone)),
  );

  watch(model.get, value => {
    temporalVal.value = toZonedDateTime(value) ?? createTemporalPartial(toValue(init.calendar), toValue(init.timeZone));
  });

  function toZonedDateTime(value: Maybe<DateValue>): Maybe<Temporal.ZonedDateTime> {
    if (isNullOrUndefined(value)) {
      return value;
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

  function toDate(value: Maybe<DateValue>): Maybe<Date> {
    if (isNullOrUndefined(value)) {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    const zonedDateTime = toZonedDateTime(value);
    if (!zonedDateTime) {
      return zonedDateTime;
    }

    return new Date(zonedDateTime.epochMilliseconds);
  }

  const temporalValue = computed({
    get: () => temporalVal.value,
    set: value => {
      temporalVal.value = value;
      if (!isTemporalPartial(value)) {
        model.set?.(toDate(value));
      }
    },
  });

  return temporalValue;
}
