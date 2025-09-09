import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { TextControlProps, useTextControl } from './useTextControl';

export type TextFieldProps = WithFieldProps<TextControlProps>;

export function useTextField(_props: Reactivify<TextFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField(getFieldInit<string | undefined>(props), 'Text');
  const control = useTextControl({
    ...props,
    _field: field,
  });

  return exposeField(control, field);
}
