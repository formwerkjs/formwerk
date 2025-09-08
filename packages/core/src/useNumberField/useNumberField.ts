import { fromNumberish, normalizeProps } from '../utils/common';
import { Numberish, Reactivify } from '../types';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { NumberControlProps, useNumberControl } from './useNumberControl';
import { toValue } from 'vue';

export type NumberFieldProps = WithFieldProps<NumberControlProps>;

export function useNumberField(_props: Reactivify<NumberFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(
    getFieldInit<number | undefined, Numberish | undefined>(
      props,
      () => toValue(props.modelValue) ?? fromNumberish(props.value),
    ),
  );

  const control = useNumberControl({ ...props, _field });

  return exposeField(control, _field);
}
