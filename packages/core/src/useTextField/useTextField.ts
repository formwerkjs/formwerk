import { toValue } from 'vue';
import { registerField } from '@formwerk/devtools';
import { normalizeProps } from '../utils/common';
import { Numberish, Reactivify } from '../types/common';
import { useFormField, exposeField } from '../useFormField';
import { TextControlProps, TextInputDOMType } from './types';
import { useTextControl } from './useTextControl';
import { StandardSchema } from '../types';

export interface TextFieldProps extends TextControlProps {
  /**
   * The label of the text field.
   */
  label: string;
  /**
   * Description text that provides additional context about the field.
   */
  description?: string;

  /**
   * The name attribute of the input element.
   */
  name?: string;

  /**
   * The value attribute of the input element.
   */
  value?: string;

  /**
   * The type of input field (text, password, email, etc).
   */
  type?: TextInputDOMType;

  /**
   * Maximum length of text input allowed.
   */
  maxLength?: Numberish;

  /**
   * Minimum length of text input required.
   */
  minLength?: Numberish;

  /**
   * Pattern for input validation using regex.
   */
  pattern?: string | RegExp | undefined;

  /**
   * Placeholder text shown when input is empty.
   */
  placeholder?: string | undefined;

  /**
   * Autocomplete hint for the input field.
   */
  autocomplete?: string | undefined;

  /**
   * Whether the field is required.
   */
  required?: boolean;

  /**
   * Whether the field is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the field is disabled.
   */
  disabled?: boolean;

  /**
   * Schema for field validation.
   */
  schema?: StandardSchema<string>;

  /**
   * Whether to disable HTML5 validation.
   */
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  disableHtmlValidation?: Boolean;
}

export function useTextField(_props: Reactivify<TextFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<string | undefined>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
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
