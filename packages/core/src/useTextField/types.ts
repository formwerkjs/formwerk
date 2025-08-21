import { EventExpression } from '../helpers/useEventListener';
import { StandardSchema } from '../types';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  Arrayable,
  InputEvents,
  Numberish,
  TextInputBaseAttributes,
  TransparentWrapper,
} from '../types/common';

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

export interface TextControlProps {
  /**
   * The v-model value of the text field.
   */
  modelValue?: string;

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

  /**
   * Events to validate on.
   */
  validateOn?: Arrayable<EventExpression>;
}
