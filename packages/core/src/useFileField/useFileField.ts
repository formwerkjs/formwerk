import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { FileControlProps, useFileControl } from './useFileControl';

export type FileFieldProps = WithFieldProps<FileControlProps>;

export function useFileField(_props: Reactivify<FileFieldProps, 'schema' | 'onUpload'>) {
  const props = normalizeProps(_props, ['schema', 'onUpload']);
  const _field = useFormField<Arrayable<string | File> | undefined>(resolveFieldInit(props));
  const control = useFileControl({ ...props, _field });

  if (__DEV__) {
    registerField(_field, 'File');
  }

  return control;
}
