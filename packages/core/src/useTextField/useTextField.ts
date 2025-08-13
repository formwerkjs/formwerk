import { shallowRef, toValue } from 'vue';
import { registerField } from '@formwerk/devtools';
import { createDescribedByProps, normalizeProps, propsToValues, useUniqId, useCaptureProps } from '../utils/common';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  TextInputBaseAttributes,
  InputEvents,
  AriaValidatableProps,
  Numberish,
  Reactivify,
} from '../types/common';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel, useErrorMessage } from '../a11y';
import { useFormField, exposeField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { StandardSchema } from '../types';
import { TransparentWrapper } from 'packages/core/dist/core';

export type TextInputDOMType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';

export interface TextInputDOMAttributes extends TextInputBaseAttributes {
  type?: TextInputDOMType;
}

export interface TextInputDOMProps
  extends TextInputDOMAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    AriaValidatableProps,
    InputEvents {
  id: string;
}

export interface TextFieldProps {
  /**
   * The label of the text field.
   */
  label: string;

  /**
   * The v-model value of the text field.
   */
  modelValue?: string;

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
  disableHtmlValidation?: TransparentWrapper<boolean>;
}

export function useTextField(_props: Reactivify<TextFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.TextField);
  const inputEl = shallowRef<HTMLInputElement>();
  const field = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { validityDetails } = useInputValidity({ inputEl, field, disableHtmlValidation: props.disableHtmlValidation });
  const { fieldValue, setValue, setTouched, errorMessage, isDisabled } = field;
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputEl,
  });

  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId,
    errorMessage,
  });

  const handlers: InputEvents = {
    onInput(evt) {
      setValue((evt.target as HTMLInputElement).value);
    },
    onChange(evt) {
      setValue((evt.target as HTMLInputElement).value);
    },
    onBlur() {
      setTouched(true);
    },
  };

  const inputProps = useCaptureProps(() => {
    return {
      ...propsToValues(props, ['name', 'type', 'placeholder', 'autocomplete', 'required', 'readonly']),
      ...labelledByProps.value,
      ...describedByProps.value,
      ...accessibleErrorProps.value,
      ...handlers,
      id: inputId,
      value: fieldValue.value,
      maxlength: toValue(props.maxLength),
      minlength: toValue(props.minLength),
      disabled: isDisabled.value ? true : undefined,
      // Maybe we need to find a better way to serialize RegExp to a pattern string
      pattern: inputEl.value?.tagName === 'TEXTAREA' ? undefined : toValue(props.pattern)?.toString(),
    };
  }, inputEl);

  if (__DEV__) {
    registerField(field, 'Text');
  }

  return exposeField(
    {
      /**
       * Props for the description element.
       */
      descriptionProps,
      /**
       * Props for the error message element.
       */
      errorMessageProps,
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
      labelProps,
      /**
       * Validity details for the input element.
       */
      validityDetails,
    },
    field,
  );
}
