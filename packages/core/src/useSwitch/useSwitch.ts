import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { SwitchControlProps, useSwitchControl } from './useSwitchControl';
import { getSwitchValue } from './utils';

export type SwitchProps<TValue = boolean> = WithFieldProps<SwitchControlProps<TValue>>;

export function useSwitch<TValue = boolean>(_props: Reactivify<SwitchProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(resolveFieldInit<TValue>(props, getSwitchValue(props)));
  const control = useSwitchControl({ ...props, _field: _field as any });

  if (__DEV__) {
    registerField(_field, 'Switch');
  }

  return control;
}
