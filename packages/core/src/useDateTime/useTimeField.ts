import { Maybe, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { toValue } from 'vue';
import { exposeField, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { TimeControlProps, useTimeControl } from './useTimeControl';

export type TimeFieldProps = WithFieldProps<TimeControlProps, string>;

export function useTimeField(_props: Reactivify<TimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<Maybe<string>>({
    label: props.label,
    description: props.description,
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    schema: props.schema,
  });

  const control = useTimeControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'Time');
  }

  return exposeField(control, _field);
}
