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
  label?: string;
  option: TValue;

  disabled?: boolean;
}

export function useOption<TOption>(_props: Reactivify<OptionProps<TOption>>, elementRef?: Ref<Maybe<HTMLElement>>) {
  const props = normalizeProps(_props);
  const optionRef = elementRef || ref<HTMLElement>();
  const isFocused = shallowRef(false);
  const selectionCtx = inject(SelectionContextKey, null);
  const listManager = inject(ListManagerKey, null);
  const isSelected = computed(() => selectionCtx?.isValueSelected(getValue()) ?? false);
  if (!selectionCtx) {
    warn(
      'An option component must exist within a Selection Context. Did you forget to call `useSelect` in a parent component?',
    );
  }

  if (!listManager) {
    warn(
      'An option component must exist within a ListBox Context. Did you forget to call `useSelect` or `useListBox` in a parent component?',
    );
  }

  function getValue() {
    return selectionCtx?.evaluateOption(toValue(props.option));
  }

  const optionId = useUniqId(FieldTypePrefixes.Option);

  listManager?.useOptionRegistration({
    id: optionId,
    toggleSelected,
    isDisabled: () => !!toValue(props.disabled),
    isSelected: () => isSelected.value,
    isFocused: () => isFocused.value,
    getLabel: () => toValue(props.label) ?? '',
    getValue,
    focus: () => {
      isFocused.value = true;
      nextTick(() => {
        optionRef.value?.focus();
      });
    },
  });

  function toggleSelected() {
    selectionCtx?.toggleValue(getValue());
  }

  const handlers = {
    onClick() {
      if (toValue(props.disabled)) {
        return;
      }

      selectionCtx?.toggleValue(getValue());
    },
    onKeydown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        toggleSelected();
      }
    },
    onBlur() {
      isFocused.value = false;
    },
  };

  const optionProps = computed<OptionDomProps>(() => {
    const isMultiple = selectionCtx?.isMultiple() ?? false;

    return withRefCapture(
      {
        id: optionId,
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
