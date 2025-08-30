import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types';
import { useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { getNumberFieldProps, NumberControlProps, useNumberControl } from './useNumberControl';

export type NumberFieldProps = WithFieldProps<NumberControlProps>;

export function useNumberField(_props: Reactivify<NumberFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<number>(getNumberFieldProps(props));
  const control = useNumberControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'Number');
  }

  return control;
}
