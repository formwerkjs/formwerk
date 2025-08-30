import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { DateControlProps, getDateFieldProps, useDateControl } from './useDateControl';

export type DateFieldProps = WithFieldProps<DateControlProps>;

export function useDateField(_props: Reactivify<DateFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(getDateFieldProps(props));
  const control = useDateControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'Date');
  }

  return control;
}
