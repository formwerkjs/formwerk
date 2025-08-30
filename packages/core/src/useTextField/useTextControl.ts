import { shallowRef, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  Arrayable,
  ControlProps,
  InputEvents,
  Numberish,
  Reactivify,
  TextInputBaseAttributes,
  TransparentWrapper,
} from '../types';
import { normalizeProps, propsToValues, useCaptureProps, useUniqId } from '../utils/common';
import { useInputValidity } from '../validation';
import { exposeField, resolveFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useVModelProxy } from '../reactivity/useVModelProxy';
import { EventExpression } from '../helpers/useEventListener';

export type TextInputDOMType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';

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

export interface TextControlProps extends ControlProps<string | undefined> {
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
   * Whether to disable HTML5 validation.
   */
  disableHtmlValidation?: TransparentWrapper<boolean>;

  /**
   * Events to validate on.
   */
  validateOn?: Arrayable<EventExpression>;
}

export function useTextControl(_props: Reactivify<TextControlProps, '_field' | 'schema'>) {
  const inputEl = shallowRef<HTMLInputElement>();
  const inputId = useUniqId(FieldTypePrefixes.TextField);
  const props = normalizeProps(_props, ['_field', 'schema']);
  const field = props?._field ?? resolveFormField(getTextFieldProps(props));
  const { model } = useVModelProxy(field);

  useInputValidity({
    inputEl,
    field,
    disableHtmlValidation: props.disableHtmlValidation,
    events: () => toValue(props.validateOn) ?? ['change', 'blur'],
  });

  field.registerControl({
    getControlElement: () => inputEl.value,
    getControlId: () => inputId,
  });

  const handlers: InputEvents = {
    onInput(evt) {
      field.setValue((evt.target as HTMLInputElement).value);
    },
    onChange(evt) {
      field.setValue((evt.target as HTMLInputElement).value);
    },
    onBlur() {
      field.setTouched(true);
    },
  };

  const inputProps = useCaptureProps(() => {
    return {
      ...propsToValues(props, ['name', 'type', 'placeholder', 'autocomplete', 'required', 'readonly']),
      ...handlers,
      id: inputId,
      ...field.accessibleErrorProps.value,
      ...field.describedByProps.value,
      ...field.labelledByProps.value,
      value: field.fieldValue.value,
      maxlength: toValue(props.maxLength),
      minlength: toValue(props.minLength),
      disabled: (field.isDisabled.value ?? toValue(props.disabled)) ? true : undefined,
      // Maybe we need to find a better way to serialize RegExp to a pattern string
      pattern: inputEl.value?.tagName === 'TEXTAREA' ? undefined : toValue(props.pattern)?.toString(),
    };
  }, inputEl);

  return exposeField(
    {
      /**
       * Props for the input element.
       */
      inputProps,
      /**
       * Ref to the input element.
       */
      inputEl,
      /**
       * The current text value of the field.
       */
      model,
    },
    field,
  );
}

export function getTextFieldProps(props: Reactivify<TextControlProps, '_field' | 'schema'>) {
  return {
    label: () => toValue(props.label) ?? '',
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  };
}
