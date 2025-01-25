import { MaybeRefOrGetter, shallowRef, toValue, watch } from 'vue';
import { getUserLocale } from '../getUserLocale';
import { isEqual } from '../../utils/common';

export function useDateFormatter(
  locale: MaybeRefOrGetter<string | undefined>,
  opts?: MaybeRefOrGetter<Intl.DateTimeFormatOptions | undefined>,
) {
  const resolvedLocale = getUserLocale();
  const formatter = shallowRef(new Intl.DateTimeFormat(toValue(locale) || resolvedLocale, toValue(opts)));

  watch(
    () => ({
      locale: toValue(locale) || resolvedLocale,
      opts: toValue(opts),
    }),
    (config, oldConfig) => {
      if (!isEqual(config, oldConfig)) {
        formatter.value = new Intl.DateTimeFormat(config.locale, config.opts);
      }
    },
  );

  return formatter;
}
