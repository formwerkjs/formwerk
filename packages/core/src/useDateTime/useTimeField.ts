import { Maybe, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { toValue } from 'vue';
import { exposeField, FieldBaseProps, useFormField } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { TimeControlProps, useTimeControl } from './useTimeControl';

export type TimeFieldProps = TimeControlProps & FieldBaseProps<string>;

export function useTimeField(_props: Reactivify<TimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<Maybe<string>>({
    label: props.label,
    description: props.description,
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    schema: props.schema,
    // TODO: Remove once all fields have controls
    syncModel: false,
  });

  const control = useTimeControl(props, { field });

  if (__DEV__) {
    registerField(field, 'Time');
  }

  return exposeField(control, field);
}
