import { toValue } from 'vue';
import { useFormField, exposeField, FieldBaseProps } from '../useFormField';
import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { registerField } from '@formwerk/devtools';
import { SelectControlProps, useSelectControl } from './useSelectControl';

export interface SelectProps<TOption, TValue = TOption>
  extends SelectControlProps<TValue>,
    FieldBaseProps<Arrayable<TValue>> {}

export function useSelect<TOption, TValue = TOption>(_props: Reactivify<SelectProps<TOption, TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<Arrayable<TValue>>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as Arrayable<TValue>,
    disabled: props.disabled,
    schema: props.schema,
    syncModel: false,
  });

  const control = useSelectControl<TOption, TValue>(props as Reactivify<SelectControlProps<TValue>>, { field });

  if (__DEV__) {
    registerField(field, 'Select');
  }

  return exposeField(control, field);
}
