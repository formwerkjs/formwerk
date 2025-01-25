import { MaybeRefOrGetter, shallowRef, toValue, watch } from 'vue';
import { Intl as TemporalIntl } from '@js-temporal/polyfill';
import { getUserLocale } from '../getUserLocale';
import { isEqual } from '../../utils/common';

const dateFormatterCache = new Map<string, TemporalIntl.DateTimeFormat>();

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions = {}) {
  const cacheKey = locale + JSON.stringify(options);
  let formatter = dateFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new TemporalIntl.DateTimeFormat(locale, options);
    dateFormatterCache.set(cacheKey, formatter);
  }

  return formatter;
}

export function useDateFormatter(
  locale: MaybeRefOrGetter<string | undefined>,
  opts?: MaybeRefOrGetter<Intl.DateTimeFormatOptions | undefined>,
) {
  const resolvedLocale = getUserLocale();
  const formatter = shallowRef(getFormatter(toValue(locale) || resolvedLocale, toValue(opts)));

  watch(
    () => ({
      locale: toValue(locale) || resolvedLocale,
      opts: toValue(opts),
    }),
    (config, oldConfig) => {
      if (!isEqual(config, oldConfig)) {
        formatter.value = getFormatter(config.locale, config.opts);
      }
    },
  );

  return formatter;
}
