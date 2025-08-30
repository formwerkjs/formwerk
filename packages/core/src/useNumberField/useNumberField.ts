import { fromNumberish, normalizeProps } from '../utils/common';
import { Numberish, Reactivify } from '../types';
import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { NumberControlProps, useNumberControl } from './useNumberControl';
import { toValue } from 'vue';

export type NumberFieldProps = WithFieldProps<NumberControlProps>;

export function useNumberField(_props: Reactivify<NumberFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(
    resolveFieldInit<number | undefined, Numberish | undefined>(
      props,
      () => toValue(props.modelValue) ?? fromNumberish(props.value),
    ),
  );
  const control = useNumberControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'Number');
  }

  return control;
}
