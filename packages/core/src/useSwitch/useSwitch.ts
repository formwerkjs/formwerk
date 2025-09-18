import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { SwitchControlProps, useSwitchControl } from './useSwitchControl';
import { getSwitchValue } from './utils';

export type SwitchProps<TValue = boolean> = WithFieldProps<SwitchControlProps<TValue>>;

export function useSwitch<TValue = boolean>(_props: Reactivify<SwitchProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField(getFieldInit<TValue>(props, getSwitchValue(props)));
  const control = useSwitchControl<TValue>({ ...(props as SwitchControlProps<TValue>), _field: field });

  return exposeField(control, field);
}
