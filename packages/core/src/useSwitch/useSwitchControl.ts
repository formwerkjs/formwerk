import { computed, shallowRef, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaInputProps,
  AriaLabelableProps,
  ControlProps,
  EventHandler,
  InputBaseAttributes,
  InputEvents,
  Reactivify,
} from '../types';
import { hasKeyCode, isEqual, isInputElement, normalizeProps, useUniqId, useCaptureProps } from '../utils/common';
import { exposeField, resolveControlField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useInputValidity } from '../validation';
import { TransparentWrapper } from '../types';
import { useVModelProxy } from '../reactivity/useVModelProxy';
import { getSwitchValue } from './utils';

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

export interface SwitchControlProps<TValue = boolean> extends ControlProps<TValue> {
  /**
   * Whether the switch is required.
   */
  required?: boolean;

  /**
   * Whether the switch is readonly.
   */
  readonly?: boolean;

  /**
   * The value to use when the switch is checked.
   */
  trueValue?: TValue;

  /**
   * The value to use when the switch is unchecked.
   */
  falseValue?: TValue;

  /**
   * Whether to disable HTML5 validation.
   */
  disableHtmlValidation?: TransparentWrapper<boolean>;
}

export function useSwitchControl<TValue = boolean>(
  _props: Reactivify<SwitchControlProps<TValue>, '_field' | 'schema'>,
) {
  const props = normalizeProps(_props, ['_field', 'schema']);
  const inputId = useUniqId(FieldTypePrefixes.Switch);
  const field = resolveControlField<TValue>(props, getSwitchValue(props));
  const inputEl = shallowRef<HTMLInputElement>();
  const { model, setModelValue } = useVModelProxy(field);

  useInputValidity({
    field,
    inputEl,
    disableHtmlValidation: props.disableHtmlValidation,
  });

  field.registerControl({
    getControlElement: () => inputEl.value,
    getControlId: () => inputId,
  });

  const isDisabled = computed(() => toValue(props.disabled) || field.isDisabled.value);
  const isMutable = () => !toValue(props.readonly) && !isDisabled.value;

  /**
   * Normalizes in the incoming value to be either one of the given toggled values or a boolean.
   */
  function normalizeValue(nextValue: unknown): TValue {
    if (typeof nextValue === 'boolean') {
      return nextValue
        ? ((toValue(props.trueValue) ?? true) as TValue)
        : ((toValue(props.falseValue) ?? false) as TValue);
    }

    const trueValue = toValue(props.trueValue);
    if (isEqual(nextValue, trueValue)) {
      return trueValue as TValue;
    }

    const falseValue = toValue(props.falseValue);
    if (isEqual(nextValue, falseValue)) {
      return falseValue as TValue;
    }

    // Normalize the incoming value to a boolean
    return !!nextValue as TValue;
  }

  function setValueFromEvent(e: Event) {
    if (!isMutable()) {
      return;
    }

    setModelValue(normalizeValue((e.target as HTMLInputElement).checked));
    field.setTouched(true);
  }

  const handlers: InputEvents & { onClick: EventHandler } = {
    onKeydown: (evt: KeyboardEvent) => {
      if (hasKeyCode(evt, 'Space') || hasKeyCode(evt, 'Enter')) {
        evt.preventDefault();

        if (!isMutable()) {
          return;
        }

        togglePressed();
        field.setTouched(true);

        if (!isInputElement(inputEl.value)) {
          field.validate();
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
    field.setTouched(true);
    field.validate();
  }

  const isPressed = computed({
    get() {
      return isEqual(model.value, toValue(props.trueValue) ?? true);
    },
    set(value: boolean) {
      setModelValue(normalizeValue(value));
    },
  });

  function createBindings(isInput: boolean): SwitchDOMProps | SwitchDomInputProps {
    const base = {
      id: inputId,
      ...field.labelledByProps.value,
      ...field.accessibleErrorProps.value,
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
       * Whether the switch is pressed.
       */
      isPressed,

      /**
       * Toggles the pressed state of the switch.
       */
      togglePressed,
    },
    field,
  );
}
