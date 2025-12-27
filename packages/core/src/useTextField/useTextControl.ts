import { shallowRef, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  Arrayable,
  BuiltInControlTypes,
  ControlProps,
  InputEvents,
  Numberish,
  Reactivify,
  TextInputBaseAttributes,
} from '../types';
import { normalizeProps, propsToValues, useCaptureProps, useUniqId } from '../utils/common';
import { useInputValidity } from '../validation';
import { resolveFieldState } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useVModelProxy } from '../reactivity/useVModelProxy';
import { EventExpression } from '../helpers/useEventListener';
import { useFieldControllerContext } from '../useFormField/useFieldController';

export type TextInputDOMType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';

export interface TextInputDOMAttributes extends TextInputBaseAttributes {
  type?: TextInputDOMType;
}

export interface TextInputDOMProps
  extends TextInputDOMAttributes, AriaLabelableProps, AriaDescribableProps, AriaValidatableProps, InputEvents {
  id: string;
}

export interface TextControlProps extends ControlProps<string | undefined> {
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
   * Whether the field is readonly.
   */
  readonly?: boolean;

  /**
   * Whether to disable HTML5 validation.
   */
  disableHtmlValidation?: Boolean;

  /**
   * Events to validate on.
   */
  validateOn?: Arrayable<EventExpression>;
}

export function useTextControl(_props: Reactivify<TextControlProps, '_field' | 'schema'>) {
  const inputEl = shallowRef<HTMLInputElement>();
  const inputId = useUniqId(FieldTypePrefixes.TextField);
  const props = normalizeProps(_props, ['_field', 'schema']);
  const field = resolveFieldState<string | undefined>(props);
  const controller = useFieldControllerContext(props);
  const { model } = useVModelProxy(field);

  useInputValidity({
    inputEl,
    field,
    disableHtmlValidation: props.disableHtmlValidation,
    events: () => toValue(props.validateOn) ?? ['change', 'blur'],
  });

  const handlers: InputEvents = {
    onInput(evt) {
      field.setValue((evt.target as HTMLInputElement).value);
      field.setTouched(true);
    },
    onBlur() {
      field.setTouched(true);
      field.setBlurred(true);
    },
  };

  controller?.registerControl({
    getControlElement: () => inputEl.value,
    getControlId: () => inputId,
    getControlType: () => BuiltInControlTypes.Text,
  });

  const inputProps = useCaptureProps(() => {
    return {
      ...propsToValues(props, ['name', 'type', 'placeholder', 'autocomplete', 'required', 'readonly']),
      ...handlers,
      id: inputId,
      ...controller?.accessibleErrorProps.value,
      ...controller?.describedByProps.value,
      ...controller?.labelledByProps.value,
      value: field.fieldValue.value,
      maxlength: toValue(props.maxLength),
      minlength: toValue(props.minLength),
      disabled: (field.isDisabled.value ?? toValue(props.disabled)) ? true : undefined,
      // Maybe we need to find a better way to serialize RegExp to a pattern string
      pattern: inputEl.value?.tagName === 'TEXTAREA' ? undefined : toValue(props.pattern)?.toString(),
    };
  }, inputEl);

  return {
    /**
     * The id of the input element.
     */
    controlId: inputId,

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

    /**
     * The field state.
     */
    field,
  };
}
