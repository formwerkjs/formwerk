import { toValue } from 'vue';
import { NormalizedProps } from '../types';
import { SwitchControlProps } from './useSwitchControl';
import { lowPriority } from '../utils/common';

export function getSwitchValue<TValue = boolean>(
  props: NormalizedProps<SwitchControlProps<TValue>, '_field' | 'schema'>,
) {
  return () =>
    (toValue(props.modelValue) ?? toValue(props.falseValue) ?? (lowPriority(false) as unknown as TValue)) as TValue;
}
