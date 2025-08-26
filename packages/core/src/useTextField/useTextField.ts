import { toValue } from 'vue';
import { registerField } from '@formwerk/devtools';
import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types/common';
import { useFormField, exposeField, WithFieldProps } from '../useFormField';
import { TextControlProps, useTextControl } from './useTextControl';

export type TextFieldProps = WithFieldProps<TextControlProps, string>;

export function useTextField(_props: Reactivify<TextFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<string | undefined>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useTextControl({
    ...props,
    _field,
  });

  if (__DEV__) {
    registerField(_field, 'Text');
  }

  return exposeField(control, _field);
}
