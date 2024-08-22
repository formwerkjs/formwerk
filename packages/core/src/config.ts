import { PartialDeep } from 'type-fest';
import { shallowRef } from 'vue';
import { getSiteLocale } from './i18n/getSiteLocale';
import { merge } from '../../shared/src';

interface Config {
  locale: string;
  validation: {
    disableHtmlValidation: boolean;
  };
}

const currentConfig = shallowRef<Config>({
  locale: getSiteLocale(),
  validation: {
    disableHtmlValidation: false,
  },
});

export function configure(config: PartialDeep<Config>) {
  currentConfig.value = merge({ ...currentConfig.value }, config);
}

export function getConfig() {
  return currentConfig.value;
}
