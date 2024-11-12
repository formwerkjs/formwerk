import { InjectionKey, MaybeRefOrGetter, Ref, computed, inject, provide, toValue } from 'vue';

interface DisabledContext {
  isDisabled: Ref<boolean>;
}

const DisabledContextKey: InjectionKey<DisabledContext> = Symbol('disabledContextKey');

/**
 * Create a disabled context.
 * @param isDisabled - The disabled state.
 * @param terminate - Whether to terminate the context and not provide it further.
 * @returns The disabled state.
 */
export function createDisabledContext(isDisabled?: MaybeRefOrGetter<boolean | undefined>) {
  const parentContext = inject(DisabledContextKey, null);
  const context: DisabledContext = {
    isDisabled: computed(() => parentContext?.isDisabled.value || toValue(isDisabled) || false),
  };

  provide(DisabledContextKey, context);

  return context.isDisabled;
}
