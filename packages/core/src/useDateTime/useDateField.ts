import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { DateControlProps, useDateControl } from './useDateControl';

export type DateFieldProps = WithFieldProps<DateControlProps>;

export function useDateField(_props: Reactivify<DateFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(resolveFieldInit<Date | undefined>(props));
  const control = useDateControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'Date');
  }

  return control;
}
