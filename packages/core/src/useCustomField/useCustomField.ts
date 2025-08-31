import { Reactivify } from '../types';
import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { normalizeProps } from '../utils/common';
import { registerField } from '@formwerk/devtools';
import { CustomControlProps, useCustomControl } from './useCustomControl';

export type CustomFieldProps<TValue = unknown> = WithFieldProps<CustomControlProps<TValue>>;

export function useCustomField<TValue = unknown>(_props: Reactivify<CustomFieldProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField(resolveFieldInit<TValue>(props));
  const control = useCustomControl<TValue>({
    ...props,
    _field: field,
  } as any);

  if (__DEV__) {
    registerField(field, 'Custom');
  }

  return control;
}
