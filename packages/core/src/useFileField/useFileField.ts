import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { FileControlProps, useFileControl } from './useFileControl';

export type FileFieldProps = WithFieldProps<FileControlProps, Arrayable<File | string>>;

export function useFileField(_props: Reactivify<FileFieldProps, 'schema' | 'onUpload'>) {
  const props = normalizeProps(_props, ['schema', 'onUpload']);
  const _field = useFormField<Arrayable<File | string>>({
    label: props.label,
    description: props.description,
    path: props.name,
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useFileControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'File');
  }

  return exposeField(control, _field);
}
