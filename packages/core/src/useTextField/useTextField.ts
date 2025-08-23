import { toValue } from 'vue';
import { registerField } from '@formwerk/devtools';
import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types/common';
import { useFormField, exposeField, FieldBaseProps } from '../useFormField';
import { TextControlProps } from './types';
import { useTextControl } from './useTextControl';

export interface TextFieldProps extends TextControlProps, FieldBaseProps<string> {}

export function useTextField(_props: Reactivify<TextFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<string | undefined>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
    // TODO: Remove once all fields have controls
    syncModel: false,
  });

  const { inputEl, inputProps } = useTextControl(props, { field });

  if (__DEV__) {
    registerField(field, 'Text');
  }

  return exposeField(
    {
      /**
       * Reference to the input element.
       */
      inputEl,
      /**
       * Props for the input element.
       */
      inputProps,

      /**
       * Props for the label element.
       */
      labelProps: field.labelProps,

      /**
       * Props for the description element.
       */
      descriptionProps: field.descriptionProps,

      /**
       * Props for the error message element.
       */
      errorMessageProps: field.errorMessageProps,
    },
    field,
  );
}
