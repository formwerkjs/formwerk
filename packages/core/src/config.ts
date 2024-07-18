import { shallowRef } from 'vue';
import { getSiteLocale } from './i18n/useLocale/getSiteLocale';

interface Config {
  locale: string;
}

const currentConfig = shallowRef<Config>({
  locale: getSiteLocale(),
});

export function configure(config: Partial<Config>) {
  currentConfig.value = {
    ...currentConfig.value,
    ...config,
  };
}

export function getConfig() {
  return currentConfig.value;
}
