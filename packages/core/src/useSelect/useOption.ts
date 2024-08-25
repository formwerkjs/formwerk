import { Maybe, Reactivify, RovingTabIndex } from '../types';
import { computed, inject, nextTick, ref, Ref, shallowRef, toValue } from 'vue';
import { SelectionContextKey } from './useSelect';
import { normalizeProps, useUniqId, warn, withRefCapture } from '../utils/common';
import { ListManagerKey } from './useListBox';
import { FieldTypePrefixes } from '../constants';

interface OptionDomProps {
  id: string;
  role: 'option';

  tabindex: RovingTabIndex;

  // Used when the listbox allows single selection
  'aria-selected'?: boolean;
  // Used when the listbox allows multiple selections
  'aria-checked'?: boolean;
}

export interface OptionProps<TValue> {
  value: TValue;

  disabled?: boolean;
}

export function useOption<TValue>(_props: Reactivify<OptionProps<TValue>>, elementRef?: Ref<Maybe<HTMLElement>>) {
  const props = normalizeProps(_props);
  const optionRef = elementRef || ref<HTMLElement>();
  const selectionCtx = inject(SelectionContextKey, null);
  if (!selectionCtx) {
    warn(
      'An option component must exist within a Selection Context. Did you forget to call `useSelect` in a parent component?',
    );
  }

  const listManager = inject(ListManagerKey, null);
  if (!listManager) {
    warn(
      'An option component must exist within a ListBox Context. Did you forget to call `useSelect` or `useListBox` in a parent component?',
    );
  }

  const isFocused = shallowRef(false);

  const isSelected = computed(() => selectionCtx?.isValueSelected(toValue(props.value)) ?? false);
  const id =
    listManager?.useOptionRegistration({
      isDisabled: () => !!toValue(props.disabled),
      isSelected: () => isSelected.value,
      isFocused: () => isFocused.value,
      getValue: () => toValue(props.value),
      focus: () => {
        isFocused.value = true;
        nextTick(() => {
          optionRef.value?.focus();
        });
      },
      unfocus() {
        isFocused.value = false;
      },
    }) ?? useUniqId(FieldTypePrefixes.Option);

  const handlers = {
    onClick() {
      if (toValue(props.disabled)) {
        return;
      }

      selectionCtx?.toggleOption(toValue(props.value));
    },
    onKeydown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        selectionCtx?.toggleOption(toValue(props.value));
      }
    },
  };

  const optionProps = computed<OptionDomProps>(() => {
    const isMultiple = selectionCtx?.isMultiple() ?? false;

    return withRefCapture(
      {
        id,
        role: 'option',
        tabindex: isFocused.value ? '0' : '-1',
        'aria-selected': isMultiple ? undefined : isSelected.value,
        'aria-checked': isMultiple ? isSelected.value : undefined,
        'aria-disabled': toValue(props.disabled),
        ...handlers,
      },
      optionRef,
      elementRef,
    );
  });

  return {
    optionProps,
    isSelected,
  };
}
