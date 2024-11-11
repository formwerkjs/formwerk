import { InjectionKey, Ref, computed, inject, provide, toValue } from 'vue';
import { Getter } from '../../types';

interface DisabledContext {
  isDisabled: Ref<boolean>;
}

const DisabledContextKey: InjectionKey<DisabledContext> = Symbol('disabledContextKey');

export function createDisabledContext(isDisabled?: Ref<boolean | undefined> | Getter<boolean | undefined>) {
  const parentContext = inject(DisabledContextKey, null);
  const context: DisabledContext = {
    isDisabled: computed(() => parentContext?.isDisabled.value || toValue(isDisabled) || false),
  };

  provide(DisabledContextKey, context);

  return context.isDisabled;
}
