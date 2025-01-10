import { Maybe, Reactivify, RovingTabIndex } from '../types';
import { computed, inject, nextTick, ref, Ref, shallowRef, toValue } from 'vue';
import { SelectionContextKey } from '../useListBox/state';
import { hasKeyCode, normalizeProps, useUniqId, warn, withRefCapture } from '../utils/common';
import { ListManagerKey } from '../useListBox/useListBox';
import { FieldTypePrefixes } from '../constants';
import { createDisabledContext } from '../helpers/createDisabledContext';

interface OptionDomProps {
  id: string;
  role: 'option';

  tabindex: RovingTabIndex;

  // Used when the listbox allows single selection
  'aria-selected'?: boolean;
  // Used when the listbox allows multiple selections
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
}

export interface OptionProps<TValue> {
  /**
   * The label text for the option.
   */
  label: string;

  /**
   * The value associated with this option.
   */
  value: TValue;

  /**
   * Whether the option is disabled.
   */
  disabled?: boolean;
}

export function useOption<TOption>(_props: Reactivify<OptionProps<TOption>>, elementRef?: Ref<Maybe<HTMLElement>>) {
  const props = normalizeProps(_props);
  const optionEl = elementRef || ref<HTMLElement>();
  const isFocused = shallowRef(false);
  const isDisabled = createDisabledContext(props.disabled);
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
    return toValue(props.value);
  }

  const optionId = useUniqId(FieldTypePrefixes.Option);

  listManager?.useOptionRegistration({
    id: optionId,
    toggleSelected,
    isDisabled: () => isDisabled.value,
    isSelected: () => isSelected.value,
    isFocused: () => isFocused.value,
    getLabel: () => toValue(props.label) ?? '',
    getValue,
    focus: () => {
      isFocused.value = true;
      nextTick(() => {
        optionEl.value?.focus();
      });
    },
  });

  function toggleSelected() {
    selectionCtx?.toggleValue(getValue());
  }

  const handlers = {
    onClick() {
      if (isDisabled.value) {
        return;
      }

      selectionCtx?.toggleValue(getValue());
    },
    onKeydown(e: KeyboardEvent) {
      if (isDisabled.value) {
        return;
      }

      if (hasKeyCode(e, 'Space') || hasKeyCode(e, 'Enter')) {
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
        'aria-disabled': isDisabled.value || undefined,
        ...handlers,
      },
      optionEl,
      elementRef,
    );
  });

  return {
    /**
     * Props for the option element.
     */
    optionProps,
    /**
     * Whether the option is selected.
     */
    isSelected,
    /**
     * Reference to the option element.
     */
    optionEl,
    /**
     * Whether the option is disabled.
     */
    isDisabled,
  };
}
