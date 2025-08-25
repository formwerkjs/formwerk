import { toValue } from 'vue';
import { Reactivify } from '../types';
import { normalizeProps, lowPriority } from '../utils/common';
import { useFormField, exposeField, FieldBaseProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { SwitchControlProps, useSwitchControl } from './useSwitchControl';

export type SwitchProps<TValue = boolean> = SwitchControlProps<TValue> & FieldBaseProps<TValue>;

export function useSwitch<TValue = boolean>(_props: Reactivify<SwitchProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<unknown>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.falseValue) ?? lowPriority(false),
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useSwitchControl(props, { field });

  if (__DEV__) {
    registerField(field, 'Switch');
  }

  return exposeField(control, field);
}
