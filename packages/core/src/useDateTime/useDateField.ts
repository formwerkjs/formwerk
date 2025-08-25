import { Maybe, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { toValue } from 'vue';
import { exposeField, FieldBaseProps, useFormField } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { DateControlProps, useDateControl } from './useDateControl';

export type DateFieldProps = DateControlProps & FieldBaseProps<Date>;

export function useDateField(_props: Reactivify<DateFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);

  const field = useFormField<Maybe<Date>>({
    label: props.label,
    description: props.description,
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    schema: props.schema,
    // TODO: Remove once all fields have controls
    syncModel: false,
  });

  const control = useDateControl(props, { field });

  if (__DEV__) {
    registerField(field, 'Date');
  }

  return exposeField(control, field);
}
