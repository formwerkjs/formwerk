import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { OtpControlProps, useOtpControl } from './useOtpControl';
import { getOtpValue } from './utils';

export type OtpFieldProps = WithFieldProps<OtpControlProps>;

export function useOtpField(_props: Reactivify<OtpFieldProps, 'schema' | 'onCompleted'>) {
  const props = normalizeProps(_props, ['schema', 'onCompleted']);
  const field = useFormField(resolveFieldInit<string | undefined>(props, getOtpValue(props)));
  const control = useOtpControl({
    ...props,
    _field: field,
  });

  if (__DEV__) {
    registerField(field, 'OTP');
  }

  return control;
}
