import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { getSwitchFieldProps, SwitchControlProps, useSwitchControl } from './useSwitchControl';

export type SwitchProps<TValue = boolean> = WithFieldProps<SwitchControlProps<TValue>>;

export function useSwitch<TValue = boolean>(_props: Reactivify<SwitchProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<TValue>(getSwitchFieldProps(props) as any);
  const control = useSwitchControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'Switch');
  }

  return control;
}
