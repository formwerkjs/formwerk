import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { SelectControlProps, useSelectControl } from './useSelectControl';

export type SelectProps<TOption, TValue = TOption> = WithFieldProps<SelectControlProps<TValue>>;

export function useSelect<TOption, TValue = TOption>(_props: Reactivify<SelectProps<TOption, TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<Arrayable<TValue> | undefined>(getFieldInit(props));
  const control = useSelectControl<TOption, TValue>({ ...(props as SelectControlProps<TValue>), _field });

  return exposeField(control, _field);
}
