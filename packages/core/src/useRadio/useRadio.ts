import { Ref, computed, inject, nextTick, ref, toValue } from 'vue';
import { isEqual, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { AriaLabelableProps, InputBaseAttributes, Reactivify, RovingTabIndex } from '../types';
import { useLabel } from '../a11y/useLabel';
import { RadioGroupContext, RadioGroupKey } from './useRadioGroup';
import { FieldTypePrefixes } from '../constants';

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
  _props: Reactivify<RadioProps<TValue>>,
  elementRef?: Ref<HTMLInputElement | undefined>,
) {
  const props = normalizeProps(_props);
  const inputId = useUniqId(FieldTypePrefixes.RadioButton);
  const group: RadioGroupContext<TValue> | null = inject(RadioGroupKey, null);
  const inputRef = elementRef || ref<HTMLInputElement>();
  const checked = computed(() => isEqual(group?.modelValue, toValue(props.value)));
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputRef,
  });

  function createHandlers(isInput: boolean) {
    const baseHandlers = {
      onClick() {
        if (toValue(props.disabled)) {
          return;
        }

        group?.setValue(toValue(props.value) as TValue);
      },
      onKeydown(e: KeyboardEvent) {
        if (toValue(props.disabled)) {
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          group?.setValue(toValue(props.value) as TValue);
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
      group?.setValue(toValue(props.value) as TValue);
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
