import { MaybeRefOrGetter, computed, shallowRef, toValue, watch } from 'vue';
import { DateValue, TemporalPartial } from './types';
import { Maybe } from '../types';
import { isNullOrUndefined } from '../utils/common';
import { createTemporalPartial, isTemporalPartial } from './temporalPartial';
import { Calendar, fromDate, toCalendar, toTimeZone, type ZonedDateTime } from '@internationalized/date';

interface TemporalValueStoreInit {
  model: {
    get: () => Maybe<Date>;
    set?: (value: Maybe<Date>) => void;
  };
  locale: MaybeRefOrGetter<string>;
  timeZone: MaybeRefOrGetter<string>;
  calendar: MaybeRefOrGetter<Calendar>;
  allowPartial?: boolean;
  min?: MaybeRefOrGetter<Maybe<ZonedDateTime>>;
  max?: MaybeRefOrGetter<Maybe<ZonedDateTime>>;
}

export function useTemporalStore(init: TemporalValueStoreInit) {
  const model = init.model;

  function normalizeNullish(value: Maybe<ZonedDateTime>): ZonedDateTime | TemporalPartial {
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

  const temporalVal = shallowRef<ZonedDateTime | TemporalPartial>(
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

    return zonedDateTime.toDate();
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
  calendar: Calendar,
  timeZone: string,
): ZonedDateTime | null | undefined {
  const zonedDt = toZonedDateTime(date, timeZone);
  if (!zonedDt) {
    return zonedDt;
  }

  return toCalendar(toTimeZone(zonedDt, timeZone), calendar);
}

export function toZonedDateTime(value: Maybe<DateValue>, timeZone: string): Maybe<ZonedDateTime> {
  if (isNullOrUndefined(value)) {
    return value;
  }

  if (value instanceof Date) {
    value = fromDate(value, timeZone);
  }

  return value;
}
