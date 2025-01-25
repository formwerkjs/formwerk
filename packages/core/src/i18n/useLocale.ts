import { computed, MaybeRefOrGetter, toValue } from 'vue';
import { getConfig } from '../config';
import { getDirection } from './getDirection';
import { getWeekInfo } from './getWeekInfo';
import { Maybe } from '../types';
import { getCalendar } from './getCalendar';
import { Temporal } from '@js-temporal/polyfill';

/**
 * Composable that resolves the currently configured locale and direction.
 */
export function useLocale(localeCode?: MaybeRefOrGetter<Maybe<string>>) {
  const localeInstance = computed(() => new Intl.Locale(toValue(localeCode) || getConfig().locale));
  const direction = computed(() => getDirection(localeInstance.value));
  const weekInfo = computed(() => getWeekInfo(localeInstance.value));
  const calendar = computed(() => new Temporal.Calendar(getCalendar(localeInstance.value)));

  const locale = computed(() => localeInstance.value.toString());

  return { locale, direction, weekInfo, calendar };
}
