import { Maybe, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { TimeControlProps, useTimeControl } from './useTimeControl';

export type TimeFieldProps = WithFieldProps<TimeControlProps>;

export function useTimeField(_props: Reactivify<TimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(getFieldInit<Maybe<string>>(props));
  const control = useTimeControl({ ...props, _field });

  return exposeField(control, _field);
}
