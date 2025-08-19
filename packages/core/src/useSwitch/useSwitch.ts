import { computed, shallowRef, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaInputProps,
  AriaLabelableProps,
  EventHandler,
  InputBaseAttributes,
  InputEvents,
  Reactivify,
  StandardSchema,
} from '../types';
import {
  hasKeyCode,
  isEqual,
  isInputElement,
  normalizeProps,
  useUniqId,
  useCaptureProps,
  lowPriority,
} from '../utils/common';
import { useLabel, useErrorMessage } from '../a11y';
import { useFieldState, exposeField } from '../useFieldState';
import { FieldTypePrefixes } from '../constants';
import { useInputValidity } from '../validation';
import { registerField } from '@formwerk/devtools';

export interface SwitchDomInputProps
  extends InputBaseAttributes,
    AriaLabelableProps,
    InputBaseAttributes,
    AriaDescribableProps,
    InputEvents {
  type: 'checkbox';
  role: 'switch';
}

export interface SwitchDOMProps extends AriaInputProps, AriaLabelableProps, AriaDescribableProps, InputEvents {
  id: string;
  tabindex: '0' | '-1';
  role: 'switch';
  'aria-checked'?: boolean;

  onClick: EventHandler;
}

export type SwitchProps<TValue = boolean> = {
  /**
   * The label text for the switch.
   */
  label: string;

  /**
   * The name attribute for the switch input.
   */
  name?: string;

  /**
   * The v-model value of the switch.
   */
  modelValue?: TValue;

  /**
   * Whether the switch is required.
   */
  required?: boolean;

  /**
   * Whether the switch is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the switch is disabled.
   */
  disabled?: boolean;

  /**
   * The value to use when the switch is checked.
   */
  trueValue?: TValue;

  /**
   * The value to use when the switch is unchecked.
   */
  falseValue?: TValue;

  /**
   * Schema for switch validation.
   */
  schema?: StandardSchema<unknown>;

  /**
   * Whether to disable HTML5 validation.
   */
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  disableHtmlValidation?: Boolean;
};

export function useSwitch<TValue = boolean>(_props: Reactivify<SwitchProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.Switch);
  const inputEl = shallowRef<HTMLInputElement>();
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputEl,
  });

  const field = useFieldState<unknown>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.falseValue) ?? lowPriority(false),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { updateValidity } = useInputValidity({
    field,
    inputEl,
    disableHtmlValidation: props.disableHtmlValidation,
  });

  const { fieldValue, setValue, setTouched, errorMessage, isDisabled } = field;
  const isMutable = () => !toValue(props.readonly) && !isDisabled.value;
  const { errorMessageProps, accessibleErrorProps } = useErrorMessage({
    inputId,
    errorMessage,
  });

  /**
   * Normalizes in the incoming value to be either one of the given toggled values or a boolean.
   */
  function normalizeValue(nextValue: unknown) {
    if (typeof nextValue === 'boolean') {
      return nextValue ? (toValue(props.trueValue) ?? true) : (toValue(props.falseValue) ?? false);
    }

    const trueValue = toValue(props.trueValue);
    if (isEqual(nextValue, trueValue)) {
      return trueValue;
    }

    const falseValue = toValue(props.falseValue);
    if (isEqual(nextValue, falseValue)) {
      return falseValue;
    }

    // Normalize the incoming value to a boolean
    return !!nextValue;
  }

  function setValueFromEvent(e: Event) {
    if (!isMutable()) {
      return;
    }

    setValue(normalizeValue((e.target as HTMLInputElement).checked));
    setTouched(true);
  }

  const handlers: InputEvents & { onClick: EventHandler } = {
    onKeydown: (evt: KeyboardEvent) => {
      if (hasKeyCode(evt, 'Space') || hasKeyCode(evt, 'Enter')) {
        evt.preventDefault();

        if (!isMutable()) {
          return;
        }

        togglePressed();
        setTouched(true);

        if (!isInputElement(inputEl.value)) {
          updateValidity();
        }
      }
    },
    onChange: setValueFromEvent,
    onInput: setValueFromEvent,
    onClick(e: Event) {
      if (!isMutable()) {
        e.preventDefault();
        return;
      }
    },
  };

  function onClick(e: Event) {
    if (!isMutable()) {
      e.preventDefault();
      return;
    }

    togglePressed();
    setTouched(true);
    updateValidity();
  }

  const isPressed = computed({
    get() {
      return isEqual(fieldValue.value, toValue(props.trueValue) ?? true);
    },
    set(value: boolean) {
      setValue(normalizeValue(value));
    },
  });

  function createBindings(isInput: boolean): SwitchDOMProps | SwitchDomInputProps {
    const base = {
      id: inputId,
      ...labelledByProps.value,
      ...accessibleErrorProps.value,
      [isInput ? 'checked' : 'aria-checked']: isPressed.value || false,
      [isInput ? 'required' : 'aria-required']: toValue(props.required) || undefined,
      [isInput ? 'readonly' : 'aria-readonly']: toValue(props.readonly) || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled.value || undefined,
      role: 'switch' as const,
    };

    if (isInput) {
      return {
        ...base,
        ...handlers,
        name: toValue(props.name),
        type: 'checkbox',
      };
    }

    return {
      ...base,
      onClick,
      tabindex: isDisabled.value ? '-1' : '0',
      onKeydown: handlers.onKeydown,
    };
  }

  /**
   * Use this if you are using a native input[type=checkbox] element.
   */
  const inputProps = useCaptureProps(() => createBindings(isInputElement(inputEl.value)), inputEl);

  function togglePressed(force?: boolean) {
    isPressed.value = force ?? !isPressed.value;
  }

  if (__DEV__) {
    registerField(field, 'Switch');
  }

  return exposeField(
    {
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
       * Whether the switch is pressed.
       */
      isPressed,
      /**
       * Props for the label element.
       */
      labelProps,
      /**
       * Toggles the pressed state of the switch.
       */
      togglePressed,
    },
    field,
  );
}
