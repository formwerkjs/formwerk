import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { getTimeFieldProps, TimeControlProps, useTimeControl } from './useTimeControl';

export type TimeFieldProps = WithFieldProps<TimeControlProps>;

export function useTimeField(_props: Reactivify<TimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(getTimeFieldProps(props));
  const control = useTimeControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'Time');
  }

  return control;
}
