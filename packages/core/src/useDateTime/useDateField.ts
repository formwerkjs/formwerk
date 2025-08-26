import { Maybe, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { toValue } from 'vue';
import { exposeField, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { DateControlProps, useDateControl } from './useDateControl';

export type DateFieldProps = WithFieldProps<DateControlProps, Date>;

export function useDateField(_props: Reactivify<DateFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);

  const _field = useFormField<Maybe<Date>>({
    label: props.label,
    description: props.description,
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    schema: props.schema,
  });

  const control = useDateControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'Date');
  }

  return exposeField(control, _field);
}
