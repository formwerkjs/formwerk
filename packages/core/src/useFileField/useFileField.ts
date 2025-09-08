import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { FileControlProps, useFileControl } from './useFileControl';

export type FileFieldProps = WithFieldProps<FileControlProps>;

export function useFileField(_props: Reactivify<FileFieldProps, 'schema' | 'onUpload'>) {
  const props = normalizeProps(_props, ['schema', 'onUpload']);
  const _field = useFormField<Arrayable<string | File> | undefined>(getFieldInit(props));
  const control = useFileControl({ ...props, _field });

  return exposeField(control, _field);
}
