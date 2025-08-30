import { registerField } from '@formwerk/devtools';
import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types/common';
import { useFormField, WithFieldProps } from '../useFormField';
import { getTextFieldProps, TextControlProps, useTextControl } from './useTextControl';

export type TextFieldProps = WithFieldProps<TextControlProps>;

export function useTextField(_props: Reactivify<TextFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<string | undefined>(getTextFieldProps(props));

  const control = useTextControl({
    ...props,
    _field,
  });

  if (__DEV__) {
    registerField(_field, 'Text');
  }

  return control;
}
