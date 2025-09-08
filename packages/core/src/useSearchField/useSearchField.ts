import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  InputEvents,
  Reactivify,
  TextInputBaseAttributes,
} from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
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
  const _field = useFormField<string | undefined>(getFieldInit(props));
  const control = useSearchControl({
    ...props,
    _field: _field,
  });

  if (__DEV__) {
    registerField(_field.state, 'Search');
  }

  return exposeField(control, _field);
}
