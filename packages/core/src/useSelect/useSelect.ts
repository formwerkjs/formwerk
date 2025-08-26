import { toValue } from 'vue';
import { useFormField, exposeField, WithFieldProps } from '../useFormField';
import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { registerField } from '@formwerk/devtools';
import { SelectControlProps, useSelectControl } from './useSelectControl';

export type SelectProps<TOption, TValue = TOption> = WithFieldProps<SelectControlProps<TValue>, Arrayable<TValue>>;

export function useSelect<TOption, TValue = TOption>(_props: Reactivify<SelectProps<TOption, TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<Arrayable<TValue>>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as Arrayable<TValue>,
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useSelectControl<TOption, TValue>({ ...(props as SelectControlProps<TValue>), _field });

  if (__DEV__) {
    registerField(_field, 'Select');
  }

  return exposeField(control, _field);
}
