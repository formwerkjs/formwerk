import { Ref, computed, shallowRef, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaInputProps,
  AriaLabelableProps,
  InputBaseAttributes,
  InputEvents,
  Reactivify,
  TypedSchema,
} from '../types';
import { isEqual, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { useLabel } from '../a11y/useLabel';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';

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
  tabindex: '0';
  role: 'switch';
  'aria-checked'?: boolean;

  onClick: (e: Event) => void;
}

export type SwitchProps = {
  label?: string;
  name?: string;
  modelValue?: boolean;

  readonly?: boolean;
  disabled?: boolean;

  trueValue?: unknown;
  falseValue?: unknown;

  schema?: TypedSchema<unknown>;
};

export function useSwitch(_props: Reactivify<SwitchProps, 'schema'>, elementRef?: Ref<HTMLInputElement>) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.Switch);
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputRef,
  });

  const { fieldValue, setValue, isTouched, setTouched } = useFormField<unknown>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.falseValue) ?? false,
    disabled: props.disabled,
    schema: props.schema,
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
    setValue(normalizeValue((e.target as HTMLInputElement).checked));
    setTouched(true);
  }

  const handlers: InputEvents = {
    onKeydown: (evt: KeyboardEvent) => {
      if (evt.code === 'Space' || evt.key === 'Enter') {
        evt.preventDefault();
        togglePressed();
        setTouched(true);
      }
    },
    onChange: setValueFromEvent,
    onInput: setValueFromEvent,
  };

  function onClick() {
    togglePressed();
    setTouched(true);
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
      [isInput ? 'checked' : 'aria-checked']: isPressed.value || false,
      [isInput ? 'readonly' : 'aria-readonly']: toValue(props.readonly) || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: toValue(props.disabled) || undefined,
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
      tabindex: '0',
      onKeydown: handlers.onKeydown,
    };
  }

  /**
   * Use this if you are using a native input[type=checkbox] element.
   */
  const inputProps = computed(() =>
    withRefCapture(createBindings(inputRef.value?.tagName === 'INPUT'), inputRef, elementRef),
  );

  function togglePressed(force?: boolean) {
    isPressed.value = force ?? !isPressed.value;
  }

  return {
    fieldValue,
    isPressed,
    inputRef,
    labelProps,
    inputProps,
    togglePressed,
    isTouched,
  };
}
