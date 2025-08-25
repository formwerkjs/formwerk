import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, FieldBaseProps, useFormField } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { FileControlProps, useFileControl } from './useFileControl';

export type FileFieldProps = FileControlProps & FieldBaseProps<Arrayable<File | string>>;

export function useFileField(_props: Reactivify<FileFieldProps, 'schema' | 'onUpload'>) {
  const props = normalizeProps(_props, ['schema', 'onUpload']);
  const field = useFormField<Arrayable<File | string>>({
    label: props.label,
    description: props.description,
    path: props.name,
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useFileControl(props, { field });

  if (__DEV__) {
    registerField(field, 'File');
  }

  return exposeField(control, field);
}
