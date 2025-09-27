import { computed, toValue } from 'vue';
import { Reactivify } from '../types';
import { TextControlProps, useTextControl } from '../useTextField/useTextControl';
import { hasKeyCode } from '../utils/common';

export interface SearchControlProps extends Omit<TextControlProps, 'type'> {
  /**
   * The label text for the clear button.
   */
  clearButtonLabel?: string;

  /**
   * Handler called when the search field is submitted via the Enter key.
   */
  onSubmit?: (value: string) => void;
}

export function useSearchControl(props: Reactivify<SearchControlProps, 'onSubmit' | '_field' | 'schema'>) {
  const control = useTextControl({
    ...props,
    type: 'search',
  });

  const field = control.field;

  function clear() {
    field.setValue('');
    field.setTouched(true);
    field.validate();
  }

  function onKeydown(e: Event) {
    if (hasKeyCode(e, 'Escape')) {
      e.preventDefault();
      if (isMutable()) {
        clear();
      }

      return;
    }

    if (hasKeyCode(e, 'Enter') && !control.inputEl.value?.form && props.onSubmit) {
      e.preventDefault();
      field.setTouched(true);
      if (field.isValid.value) {
        props.onSubmit(field.fieldValue.value || '');
      }
    }
  }

  const isMutable = () => !toValue(props.readonly) && !field.isDisabled.value;

  const clearBtnProps = computed(() => {
    return {
      tabindex: '-1',
      type: 'button' as const,
      ariaLabel: toValue(props.clearButtonLabel) ?? 'Clear search',
      onClick() {
        if (isMutable()) {
          clear();
        }
      },
    };
  });

  const inputProps = computed(() => {
    return {
      ...control.inputProps.value,
      onKeydown: onKeydown,
    };
  });

  return {
    ...control,

    /**
     * Props for the clear button.
     */
    clearBtnProps,

    /**
     * Props for the input element.
     */
    inputProps,
  };
}
