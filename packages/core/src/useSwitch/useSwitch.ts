import { Ref, computed, shallowRef, toValue } from 'vue';
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
  createAccessibleErrorMessageProps,
  hasKeyCode,
  isEqual,
  isInputElement,
  normalizeProps,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import { useLabel } from '../a11y/useLabel';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useInputValidity } from '../validation';
import { exposeField } from '../utils/exposers';

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

export type SwitchProps = {
  label?: string;
  name?: string;
  modelValue?: boolean;

  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;

  trueValue?: unknown;
  falseValue?: unknown;

  schema?: StandardSchema<unknown>;

  disableHtmlValidation?: boolean;
};

export function useSwitch(_props: Reactivify<SwitchProps, 'schema'>, elementRef?: Ref<HTMLInputElement>) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.Switch);
  const inputEl = elementRef || shallowRef<HTMLInputElement>();
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputEl,
  });

  const field = useFormField<unknown>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.falseValue) ?? false,
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
  const { errorMessageProps, accessibleErrorProps } = createAccessibleErrorMessageProps({
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
  const inputProps = computed(() => withRefCapture(createBindings(isInputElement(inputEl.value)), inputEl, elementRef));

  function togglePressed(force?: boolean) {
    isPressed.value = force ?? !isPressed.value;
  }

  return {
    errorMessageProps,
    inputEl,
    inputProps,
    isPressed,
    labelProps,
    togglePressed,
    ...exposeField(field),
  };
}
