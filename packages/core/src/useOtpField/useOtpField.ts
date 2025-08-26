import { toValue } from 'vue';
import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { OtpControlProps, useOtpControl, withPrefix } from './useOtpControl';

export type OtpFieldProps = WithFieldProps<OtpControlProps, string>;

export function useOtpField(_props: Reactivify<OtpFieldProps, 'schema' | 'onCompleted'>) {
  const props = normalizeProps(_props, ['schema', 'onCompleted']);
  const field = useFormField<string>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: withPrefix(toValue(props.modelValue) ?? toValue(props.value), props.prefix),
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useOtpControl({
    ...props,
    _field: field,
  });

  if (__DEV__) {
    registerField(field, 'OTP');
  }

  return exposeField(control, field);
}
