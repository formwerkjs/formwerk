import { toValue, watch } from 'vue';
import { BuiltInControlTypes, Reactivify } from '../types';
import { exposeField, useFormField } from '../useFormField';
import { normalizeProps } from '../utils/common';
import { useInputValidity } from '../validation';

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

  const field = useFormField(
    {
      label: '',
      disabled: props.disabled,
      path: props.name,
      initialValue: toValue(props.value),
    },
    BuiltInControlTypes.Hidden,
  );

  useInputValidity({
    field: field.state,
  });

  watch(
    () => toValue(props.value),
    value => {
      field.state.setValue(value);
    },
  );

  return exposeField({}, field);
}
