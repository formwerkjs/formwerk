import { toValue } from 'vue';
import { registerField } from '@formwerk/devtools';
import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types/common';
import { useFieldState, exposeField } from '../useFieldState';
import { TextControlProps } from './types';
import { useTextControl } from './useTextControl';
import { useFormField } from '../useFormField';

export interface TextFieldProps extends TextControlProps {
  /**
   * The label of the text field.
   */
  label: string;
  /**
   * Description text that provides additional context about the field.
   */
  description?: string;
}

export function useTextField(_props: Reactivify<TextFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const state = useFieldState<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const field = useFormField(
    {
      label: props.label,
      description: props.description,
    },
    state,
  );

  const { inputEl, inputProps } = useTextControl(props, { state, field });

  if (__DEV__) {
    registerField(state, 'Text');
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
    state,
  );
}
