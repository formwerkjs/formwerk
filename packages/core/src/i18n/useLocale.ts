import { computed, MaybeRefOrGetter, toValue } from 'vue';
import { getConfig } from '../config';
import { getDirection } from './getDirection';
import { getWeekInfo } from './getWeekInfo';
import { Maybe, Reactivify } from '../types';
import { getCalendar } from './getCalendar';
import { Calendar } from '@internationalized/date';
import { getTimeZone } from './getTimezone';

export type NumberLocaleExtension = `nu-${string}`;

export interface LocaleExtension {
  number: Maybe<NumberLocaleExtension>;
  calendar: Maybe<Calendar>;
}

/**
 * Composable that resolves the currently configured locale and direction.
 */
export function useLocale(
  localeCode?: MaybeRefOrGetter<Maybe<string>>,
  extensions: Partial<Reactivify<LocaleExtension>> = {},
) {
  const localeString = computed(() => {
    let code = toValue(localeCode) || getConfig().locale;
    const calExt = toValue(extensions.calendar);
    const numExt = toValue(extensions.number);

    // Add the base locale extension if it's not already present
    if (!code.includes('-u-') && (numExt || calExt)) {
      code += '-u-';
    }

    // Add the number locale extension if it's not already present
    if (!code.includes('-nu-') && numExt) {
      code += `-nu-${numExt}`;
    }

    // Add the calendar locale extension if it's not already present
    if (!code.includes('-ca-') && calExt?.identifier) {
      code += `-ca-${calExt.identifier}`;
    }

    code = code.replaceAll('--', '-');

    return code;
  });

  const localeInstance = computed(() => new Intl.Locale(localeString.value));
  const direction = computed(() => getDirection(localeInstance.value));
  const weekInfo = computed(() => getWeekInfo(localeInstance.value));
  const calendar = computed(() => getCalendar(localeInstance.value));
  const timeZone = computed(() => getTimeZone(localeInstance.value));
  const locale = computed(() => localeInstance.value.toString());

  return { locale, direction, weekInfo, calendar, timeZone };
}
