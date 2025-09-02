import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { registerField } from '@formwerk/devtools';
import { SelectControlProps, useSelectControl } from './useSelectControl';

export type SelectProps<TOption, TValue = TOption> = WithFieldProps<SelectControlProps<TValue>>;

export function useSelect<TOption, TValue = TOption>(_props: Reactivify<SelectProps<TOption, TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<Arrayable<TValue>>(resolveFieldInit(props));
  const control = useSelectControl<TOption, TValue>({ ...props, _field } as any);

  if (__DEV__) {
    registerField(_field, 'Select');
  }

  return control;
}
