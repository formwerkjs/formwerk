import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { DateControlProps, useDateControl } from './useDateControl';

export type DateFieldProps = WithFieldProps<DateControlProps>;

export function useDateField(_props: Reactivify<DateFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(getFieldInit<Date | undefined>(props));
  const control = useDateControl({ ...props, _field });

  return exposeField(control, _field);
}
