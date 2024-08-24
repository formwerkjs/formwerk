import { Reactivify } from '../types';
import { computed, inject, toValue } from 'vue';
import { SelectionContextKey } from './useSelect';
import { normalizeProps, warn } from '../utils/common';

interface OptionDomProps {
  role: 'option';

  // Used when the listbox allows single selection
  'aria-selected'?: boolean;
  // Used when the listbox allows multiple selections
  'aria-checked'?: boolean;
}

export interface OptionProps<TValue> {
  value: TValue;
  disabled?: boolean;
}

export function useOption<TValue>(_props: Reactivify<OptionProps<TValue>>) {
  const props = normalizeProps(_props);
  const selectionCtx = inject(SelectionContextKey, null);
  if (!selectionCtx) {
    warn(
      'An option component must exist within a Selection Context. Did you forget to call `useSelect` in a parent component?',
    );
  }

  const isSelected = computed(() => selectionCtx?.isSelected(toValue(props.value)) ?? false);
  const isHighlighted = computed(() => selectionCtx?.isHighlighted(toValue(props.value)) ?? false);

  const handlers = {
    onClick() {
      if (toValue(props.disabled)) {
        return;
      }

      selectionCtx?.toggleOption(toValue(props.value));
    },
  };

  const optionProps = computed<OptionDomProps>(() => {
    const isMultiple = selectionCtx?.isMultiple() ?? false;

    return {
      role: 'option',
      'aria-selected': isMultiple ? undefined : isSelected.value,
      'aria-checked': isMultiple ? isSelected.value : undefined,
      'aria-disabled': toValue(props.disabled),
      ...handlers,
    };
  });

  return {
    optionProps,
    isSelected,
    isHighlighted,
  };
}
