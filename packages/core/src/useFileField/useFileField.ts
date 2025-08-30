import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { FileControlProps, getFileFieldProps, useFileControl } from './useFileControl';

export type FileFieldProps = WithFieldProps<FileControlProps>;

export function useFileField(_props: Reactivify<FileFieldProps, 'schema' | 'onUpload'>) {
  const props = normalizeProps(_props, ['schema', 'onUpload']);
  const _field = useFormField(getFileFieldProps(props));
  const control = useFileControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'File');
  }

  return control;
}
