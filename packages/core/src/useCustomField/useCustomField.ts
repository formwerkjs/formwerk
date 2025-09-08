import { Reactivify } from '../types';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { normalizeProps } from '../utils/common';
import { CustomControlProps, useCustomControl } from './useCustomControl';

export type CustomFieldProps<TValue = unknown> = WithFieldProps<CustomControlProps<TValue>>;

export function useCustomField<TValue = unknown>(_props: Reactivify<CustomFieldProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField(getFieldInit<TValue>(props));
  const control = useCustomControl<TValue>({
    ...(props as CustomControlProps<TValue>),
    _field: field,
  });

  return exposeField(control, field);
}
