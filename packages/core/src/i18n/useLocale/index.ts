import { computed } from 'vue';
import { getConfig } from '../../config';
import { getDirection } from './getDirection';

export function useLocale() {
  const locale = computed(() => getConfig().locale);
  const direction = computed(() => getDirection(locale.value));

  return { locale, direction };
}
