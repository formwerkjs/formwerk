import { inject, InjectionKey, provide } from 'vue';

export interface FormPathPrefixerContext {
  prefixPath: (path: string | undefined) => string | undefined;
}

export const FormPathPrefixerKey: InjectionKey<FormPathPrefixerContext> = Symbol('FormPathPrefixerKey');

export function createPathPrefixer(prefix: (path: string | undefined) => string | undefined) {
  const prefixer: FormPathPrefixerContext = {
    prefixPath: prefix,
  };

  provide(FormPathPrefixerKey, prefixer);

  return prefixer;
}

export function usePathPrefixer() {
  return inject(FormPathPrefixerKey, null);
}
