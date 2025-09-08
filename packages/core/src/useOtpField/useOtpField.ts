import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { OtpControlProps, useOtpControl } from './useOtpControl';
import { getOtpValue } from './utils';

export type OtpFieldProps = WithFieldProps<OtpControlProps>;

export function useOtpField(_props: Reactivify<OtpFieldProps, 'schema' | 'onCompleted'>) {
  const props = normalizeProps(_props, ['schema', 'onCompleted']);
  const field = useFormField(getFieldInit<string | undefined>(props, getOtpValue(props)));
  const control = useOtpControl({
    ...props,
    _field: field,
  });

  return exposeField(control, field);
}
