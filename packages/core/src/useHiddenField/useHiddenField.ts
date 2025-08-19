import { toValue, watch } from 'vue';
import { Reactivify } from '../types';
import { exposeField, useFieldState } from '../useFieldState';
import { normalizeProps } from '../utils/common';
import { useInputValidity } from '../validation';
import { registerField } from '@formwerk/devtools';

export interface HiddenFieldProps<TValue = unknown> {
  /**
   * The name attribute for the hidden field.
   */
  name: string;

  /**
   * The value of the hidden field.
   */
  value: TValue;

  /**
   * Whether the hidden field is disabled.
   */
  disabled?: boolean;
}

export function useHiddenField<TValue = unknown>(_props: Reactivify<HiddenFieldProps<TValue>>) {
  const props = normalizeProps(_props);

  const field = useFieldState({
    disabled: props.disabled,
    path: props.name,
    initialValue: toValue(props.value),
  });

  useInputValidity({
    field,
  });

  watch(
    () => toValue(props.value),
    value => {
      field.setValue(value);
    },
  );

  if (__DEV__) {
    registerField(field, 'Hidden');
  }

  return exposeField({}, field);
}
