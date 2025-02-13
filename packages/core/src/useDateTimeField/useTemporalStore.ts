import { MaybeRefOrGetter, computed, shallowRef, toValue, watch } from 'vue';
import { DateValue, TemporalPartial } from './types';
import { Maybe } from '../types';
import { isNullOrUndefined } from '../utils/common';
import { createTemporalPartial, isTemporalPartial } from './temporalPartial';
import { Calendar, fromDate, type ZonedDateTime } from '@internationalized/date';

interface TemporalValueStoreInit {
  model: {
    get: () => Maybe<Date>;
    set?: (value: Maybe<Date>) => void;
  };
  locale: MaybeRefOrGetter<string>;
  timeZone: MaybeRefOrGetter<string>;
  calendar: MaybeRefOrGetter<Calendar>;
  allowPartial?: boolean;
}

export function useTemporalStore(init: TemporalValueStoreInit) {
  const model = init.model;
  const temporalVal = shallowRef<ZonedDateTime | TemporalPartial>(
    toZonedDateTime(model.get()) ?? createTemporalPartial(toValue(init.calendar), toValue(init.timeZone)),
  );

  watch(model.get, value => {
    if (!value && isTemporalPartial(temporalVal.value)) {
      return;
    }

    temporalVal.value = toZonedDateTime(value) ?? createTemporalPartial(toValue(init.calendar), toValue(init.timeZone));
  });

  function toZonedDateTime(value: Maybe<DateValue>): Maybe<ZonedDateTime> {
    if (isNullOrUndefined(value)) {
      return value;
    }

    if (value instanceof Date) {
      value = fromDate(value, toValue(init.timeZone));
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
