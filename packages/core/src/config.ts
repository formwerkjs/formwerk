import { shallowRef } from 'vue';
import { getLocale } from './i18n/useLocale/getLocale';

interface Config {
  locale: string;
}

const currentConfig = shallowRef<Config>({
  locale: getLocale(),
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
