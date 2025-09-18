import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  BuiltInControlTypes,
  InputEvents,
  Reactivify,
  TextInputBaseAttributes,
} from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { SearchControlProps, useSearchControl } from './useSearchControl';

export interface SearchInputDOMAttributes extends TextInputBaseAttributes {
  type?: 'search';
}

export interface SearchInputDOMProps
  extends SearchInputDOMAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    AriaValidatableProps,
    InputEvents {
  id: string;
}

export type SearchFieldProps = WithFieldProps<SearchControlProps>;

export function useSearchField(_props: Reactivify<SearchFieldProps, 'onSubmit' | 'schema'>) {
  const props = normalizeProps(_props, ['onSubmit', 'schema']);
  const _field = useFormField<string | undefined>(getFieldInit(props), BuiltInControlTypes.Search);
  const control = useSearchControl({
    ...props,
    _field: _field,
  });

  return exposeField(control, _field);
}
