import { Ref, computed, inject, nextTick, ref, toValue } from 'vue';
import { uniqId, withRefCapture } from '../utils/common';
import { AriaLabelableProps, InputBaseAttributes, Reactivify, RovingTabIndex } from '../types';
import { useLabel } from '../composables/useLabel';
import { RadioGroupContext, RadioGroupKey } from './useRadioGroup';

export interface RadioProps<TValue = string> {
  value: TValue;
  label?: string;
  disabled?: boolean;
}

export interface RadioDomInputProps extends AriaLabelableProps, InputBaseAttributes {
  type: 'radio';
}

export interface RadioDomProps extends AriaLabelableProps {
  tabindex: RovingTabIndex;
  role: 'radio';
  'aria-checked'?: boolean;
  'aria-readonly'?: boolean;
  'aria-disabled'?: boolean;
  'aria-required'?: boolean;
}

export function useRadio<TValue = string>(
  props: Reactivify<RadioProps<TValue>>,
  elementRef?: Ref<HTMLInputElement | undefined>,
) {
  const inputId = uniqId();
  const group: RadioGroupContext<TValue> | null = inject(RadioGroupKey, null);
  const inputRef = elementRef || ref<HTMLInputElement>();
  const checked = computed(() => group?.modelValue === props.value);
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputRef,
  });

  function createHandlers(isInput: boolean) {
    const baseHandlers = {
      onClick() {
        group?.setValue(toValue(props.value));
      },
      onKeydown(e: KeyboardEvent) {
        if (e.code === 'Space') {
          e.preventDefault();
          group?.setValue(toValue(props.value));
        }
      },
    };

    if (isInput) {
      return {
        ...baseHandlers,
        onChange() {
          group?.setValidity(inputRef.value?.validationMessage ?? '');
        },
        onInvalid() {
          group?.setValidity(inputRef.value?.validationMessage ?? '');
        },
      };
    }

    return baseHandlers;
  }

  const isDisabled = () => toValue(props.disabled || group?.disabled) ?? false;

  function focus() {
    inputRef.value?.focus();
  }

  function createBindings(isInput: boolean) {
    return {
      ...labelledByProps.value,
      ...createHandlers(isInput),
      id: inputId,
      name: group?.name,
      [isInput ? 'checked' : 'aria-checked']: checked.value || undefined,
      [isInput ? 'readonly' : 'aria-readonly']: group?.readonly || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled() || undefined,
      [isInput ? 'required' : 'aria-required']: group?.required,
    };
  }

  const registration = group?.useRadioRegistration({
    isChecked: () => checked.value,
    isDisabled,
    setChecked: () => {
      group?.setValue(toValue(props.value));
      focus();
      nextTick(() => {
        group?.setValidity(inputRef.value?.validationMessage ?? '');
      });

      return true;
    },
  });

  const inputProps = computed<RadioDomInputProps>(() =>
    withRefCapture(
      {
        type: 'radio',
        ...createBindings(true),
      },
      inputRef,
      elementRef,
    ),
  );

  const radioProps = computed<RadioDomProps>(() =>
    withRefCapture(
      {
        role: 'radio',
        tabindex: checked.value ? '0' : registration?.canReceiveFocus() ? '0' : '-1',
        ...createBindings(false),
      },
      inputRef,
      elementRef,
    ),
  );

  return {
    inputRef,
    labelProps,
    inputProps,
    radioProps,
    isChecked: checked,
  };
}
