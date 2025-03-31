import { MaybeRefOrGetter, computed, shallowRef, toValue, watch } from 'vue';
import { DateValue, TemporalPartial } from './types';
import { Maybe } from '../types';
import { isNullOrUndefined } from '../utils/common';
import { createTemporalPartial, isTemporalPartial } from './temporalPartial';
import { Temporal, toTemporalInstant } from 'temporal-polyfill';
interface TemporalValueStoreInit {
  model: {
    get: () => Maybe<Date>;
    set?: (value: Maybe<Date>) => void;
  };
  locale: MaybeRefOrGetter<string>;
  timeZone: MaybeRefOrGetter<string>;
  calendar: MaybeRefOrGetter<string>;
  allowPartial?: boolean;
  min?: MaybeRefOrGetter<Maybe<Temporal.ZonedDateTime>>;
  max?: MaybeRefOrGetter<Maybe<Temporal.ZonedDateTime>>;
}

export function useTemporalStore(init: TemporalValueStoreInit) {
  const model = init.model;

  function normalizeNullish(value: Maybe<Temporal.ZonedDateTime>): Temporal.ZonedDateTime | TemporalPartial {
    if (isNullOrUndefined(value)) {
      return createTemporalPartial(
        toValue(init.calendar),
        toValue(init.timeZone),
        toValue(init.min),
        toValue(init.max),
      );
    }

    return value;
  }

  const temporalVal = shallowRef<Temporal.ZonedDateTime | TemporalPartial>(
    normalizeNullish(fromDateToCalendarZonedDateTime(model.get(), toValue(init.calendar), toValue(init.timeZone))),
  );

  watch(model.get, value => {
    if (!value && isTemporalPartial(temporalVal.value)) {
      return;
    }

    temporalVal.value = normalizeNullish(
      fromDateToCalendarZonedDateTime(value, toValue(init.calendar), toValue(init.timeZone)),
    );
  });

  function toDate(value: Maybe<DateValue>): Maybe<Date> {
    if (isNullOrUndefined(value)) {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    const zonedDateTime = toZonedDateTime(value, toValue(init.timeZone));
    if (!zonedDateTime) {
      return zonedDateTime;
    }

    return new Date(zonedDateTime.toInstant().epochMilliseconds);
  }

  const temporalValue = computed({
    get: () => temporalVal.value,
    set: value => {
      temporalVal.value = value;
      model.set?.(isTemporalPartial(value) ? undefined : toDate(value));
    },
  });

  return temporalValue;
}

export function fromDateToCalendarZonedDateTime(
  date: Maybe<Date>,
  calendar: string,
  timeZone: string,
): Temporal.ZonedDateTime | null | undefined {
  const zonedDt = toZonedDateTime(date, timeZone);
  if (!zonedDt) {
    return zonedDt;
  }

  return Temporal.ZonedDateTime.from(zonedDt).withCalendar(calendar);
}

export function toZonedDateTime(value: Maybe<DateValue>, timeZone: string): Maybe<Temporal.ZonedDateTime> {
  if (isNullOrUndefined(value)) {
    return value;
  }

  if (value instanceof Date) {
    value = toTemporalInstant.call(value).toZonedDateTimeISO(timeZone);
  }

  return value;
}
