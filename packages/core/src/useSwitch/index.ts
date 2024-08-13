import { Ref, computed, shallowRef, toValue } from 'vue';
import { AriaDescribableProps, AriaLabelableProps, InputBaseAttributes, InputEvents, Reactivify } from '../types';
import { isEqual, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { useLabel } from '../a11y/useLabel';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';

export interface SwitchDOMProps extends InputBaseAttributes, AriaLabelableProps, AriaDescribableProps, InputEvents {
  id: string;
  checked: boolean;
  name?: string;
  role?: string;
}

export type SwitchProps = {
  label?: string;
  name?: string;
  modelValue?: boolean;

  readonly?: boolean;
  disabled?: boolean;

  trueValue?: unknown;
  falseValue?: unknown;
};

export function useSwitch(_props: Reactivify<SwitchProps>, elementRef?: Ref<HTMLInputElement>) {
  const props = normalizeProps(_props);
  const id = useUniqId(FieldTypePrefixes.Switch);
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const { labelProps, labelledByProps } = useLabel({
    for: id,
    label: props.label,
    targetRef: inputRef,
  });

  const { fieldValue, setValue, isTouched, setTouched } = useFormField<unknown>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.falseValue) ?? false,
    disabled: props.disabled,
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

  /**
   * Use this if you are using a native input[type=checkbox] element.
   */
  const inputProps = computed<SwitchDOMProps>(() =>
    withRefCapture(
      {
        ...labelledByProps.value,
        id: id,
        name: toValue(props.name),
        disabled: toValue(props.disabled),
        readonly: toValue(props.readonly),
        checked: isPressed.value,
        role: 'switch',
        ...handlers,
      },
      inputRef,
      elementRef,
    ),
  );

  /**
   * Use this if you are using divs or buttons
   */
  const switchProps = computed(() => ({
    ...labelledByProps.value,
    role: 'switch',
    tabindex: '0',
    'aria-checked': isPressed.value ?? false,
    'aria-readonly': toValue(props.readonly) ?? undefined,
    'aria-disabled': toValue(props.disabled) ?? undefined,
    onKeydown: handlers.onKeydown,
    onClick,
  }));

  function togglePressed(force?: boolean) {
    isPressed.value = force ?? !isPressed.value;
  }

  return {
    fieldValue,
    isPressed,
    inputRef,
    labelProps,
    inputProps,
    switchProps,
    togglePressed,
    isTouched,
  };
}
