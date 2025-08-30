import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { getOtpFieldProps, OtpControlProps, useOtpControl } from './useOtpControl';

export type OtpFieldProps = WithFieldProps<OtpControlProps>;

export function useOtpField(_props: Reactivify<OtpFieldProps, 'schema' | 'onCompleted'>) {
  const props = normalizeProps(_props, ['schema', 'onCompleted']);
  const field = useFormField<string>(getOtpFieldProps(props));

  const control = useOtpControl({
    ...props,
    _field: field,
  });

  if (__DEV__) {
    registerField(field, 'OTP');
  }

  return control;
}
