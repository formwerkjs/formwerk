import { computed, shallowRef, toValue } from 'vue';
import { getSiteLocale } from './i18n/getSiteLocale';
import { merge } from '../../shared/src';
import { Reactivify } from './types';

interface Config {
  locale: string;
  detectDirection: boolean;
  disableHtmlValidation: boolean;
}

const currentConfig = shallowRef<Reactivify<Config>>({
  locale: getSiteLocale(),
  detectDirection: true,
  disableHtmlValidation: false,
});

const evaluatedConfig = computed(() => {
  const config = currentConfig.value;

  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      if (key === 'validation') {
        return [key, value] as const;
      }

      return [key, toValue(value)] as const;
    }),
  ) as unknown as Config;
});

export function configure(config: Partial<Reactivify<Config>>) {
  currentConfig.value = merge({ ...currentConfig.value }, config);
}

export function getConfig() {
  return evaluatedConfig.value;
}
