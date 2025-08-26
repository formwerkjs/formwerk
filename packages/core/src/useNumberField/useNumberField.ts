import { toValue } from 'vue';
import { fromNumberish, normalizeProps } from '../utils/common';
import { Reactivify } from '../types';
import { exposeField, FieldBaseProps, useFormField } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { NumberControlProps, useNumberControl } from './useNumberControl';

export type NumberFieldProps = NumberControlProps & FieldBaseProps<number>;

export function useNumberField(_props: Reactivify<NumberFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<number>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? fromNumberish(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useNumberControl(props, { field });

  if (__DEV__) {
    registerField(field, 'Number');
  }

  return exposeField(control, field);
}
