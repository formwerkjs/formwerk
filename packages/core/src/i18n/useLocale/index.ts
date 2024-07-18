import { computed } from 'vue';
import { getConfig } from '../../config';
import { getDirection } from './getDirection';

export * from './getDirection';
export * from './getUserLocale';
export * from './getSiteLocale';

export function useLocale() {
  const locale = computed(() => getConfig().locale);
  const direction = computed(() => getDirection(locale.value));

  return { locale, direction };
}
