import { Orientation, Reactivify } from '../types';
import { computed, InjectionKey, nextTick, onBeforeUnmount, provide, shallowRef, toValue, watch } from 'vue';
import { normalizeProps, removeFirst, useUniqId } from '../utils/common';
import { FieldTypePrefixes } from '../constants';

export interface ListBoxProps<TOption> {
  options: TOption[];
  multiple?: boolean;
  orientation?: Orientation;
}

export interface ListBoxDomProps {
  role: 'listbox';
  'aria-multiselectable'?: boolean;
}

export interface OptionRegistration<TValue> {
  isFocused(): boolean;
  isSelected(): boolean;
  isDisabled(): boolean;
  getValue(): TValue;
  focus(): void;
  unfocus(): void;
}

export interface OptionRegistrationWithId<TValue> extends OptionRegistration<TValue> {
  id: string;
}

export interface ListManagerCtx<TOption = unknown> {
  useOptionRegistration(init: OptionRegistration<TOption>): string;
}

export const ListManagerKey: InjectionKey<ListManagerCtx> = Symbol('ListManagerKey');

export function useListBox<TOption>(_props: Reactivify<ListBoxProps<TOption>>) {
  const props = normalizeProps(_props);
  const options = shallowRef<OptionRegistrationWithId<TOption>[]>([]);
  const isOpen = shallowRef(false);

  const listManager: ListManagerCtx = {
    useOptionRegistration(init: OptionRegistration<TOption>) {
      const id = useUniqId(FieldTypePrefixes.Option);
      options.value.push({ ...init, id });

      onBeforeUnmount(() => {
        removeFirst(options.value, reg => reg.id === id);
      });

      return id;
    },
  };

  provide(ListManagerKey, listManager);

  const handlers = {
    onKeydown(e: KeyboardEvent) {
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        focusNext();
        return;
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        focusPrev();
        return;
      }

      if (e.code === 'Tab') {
        isOpen.value = false;
      }
    },
  };

  function focusNext() {
    const currentlyFocusedIdx = options.value.findIndex(o => o.isFocused());
    // Focus first one if none is focused
    if (currentlyFocusedIdx === -1) {
      options.value[0]?.focus();
      return;
    }

    const nextIdx = Math.min(currentlyFocusedIdx + 1, options.value.length - 1);
    options.value[currentlyFocusedIdx]?.unfocus();
    options.value[nextIdx]?.focus();
  }

  function focusPrev() {
    const currentlyFocusedIdx = options.value.findIndex(o => o.isFocused());
    // Focus first one if none is focused
    if (currentlyFocusedIdx === -1) {
      options.value[0]?.focus();
      return;
    }

    const nextIdx = Math.max(currentlyFocusedIdx - 1, 0);
    options.value[currentlyFocusedIdx]?.unfocus();
    options.value[nextIdx]?.focus();
  }

  const listBoxProps = computed<ListBoxDomProps>(() => {
    return {
      role: 'listbox',
      'aria-multiselectable': toValue(props.multiple) ?? undefined,
      ...handlers,
    };
  });

  watch(isOpen, async value => {
    const currentlyFocused = options.value.findIndex(o => o.isFocused());
    options.value[currentlyFocused]?.unfocus();
    if (!value) {
      return;
    }

    await nextTick();
    const currentlySelected = options.value.findIndex(o => o.isSelected());
    const toBeSelected = currentlySelected === -1 ? 0 : currentlySelected;
    options.value[toBeSelected]?.focus();
  });

  return {
    listBoxProps,
    isOpen,
  };
}
