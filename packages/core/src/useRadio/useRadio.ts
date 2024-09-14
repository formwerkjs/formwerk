import { Ref, computed, inject, ref, toValue } from 'vue';
import { isEqual, isInputElement, normalizeProps, useUniqId, warn, withRefCapture } from '../utils/common';
import { AriaInputProps, AriaLabelableProps, InputBaseAttributes, Reactivify, RovingTabIndex } from '../types';
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

export interface RadioDomProps extends AriaInputProps, AriaLabelableProps {
  tabindex: RovingTabIndex;
  role: 'radio';
  'aria-checked'?: boolean;
}

export function useRadio<TValue = string>(
  _props: Reactivify<RadioProps<TValue>>,
  elementRef?: Ref<HTMLInputElement | undefined>,
) {
  const props = normalizeProps(_props);
  const inputId = useUniqId(FieldTypePrefixes.RadioButton);
  const group: RadioGroupContext<TValue> | null = inject(RadioGroupKey, null);
  const inputEl = elementRef || ref<HTMLInputElement>();
  const checked = computed(() => isEqual(group?.modelValue, toValue(props.value)));
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputEl,
  });

  if (!group) {
    warn(
      'A Radio component must be a part of a Radio Group. Make sure you have called useRadioGroup at a parent component',
    );
  }

  const isDisabled = () => toValue(props.disabled || group?.disabled) ?? false;

  function focus() {
    inputEl.value?.focus();
  }

  function setChecked() {
    group?.setGroupValue(toValue(props.value) as TValue, inputEl.value);
    group?.setTouched(true);
    focus();

    return true;
  }

  const registration = group?.useRadioRegistration({
    id: inputId,
    getElem: () => inputEl.value,
    isChecked: () => checked.value,
    isDisabled,
    setChecked,
  });

  const handlers = {
    onClick() {
      if (toValue(props.disabled)) {
        return;
      }

      setChecked();
    },
    onKeydown(e: KeyboardEvent) {
      if (toValue(props.disabled)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setChecked();
      }
    },
    onBlur() {
      group?.setTouched(true);
    },
  };

  function createBindings(isInput: boolean): RadioDomInputProps | RadioDomProps {
    const base = {
      ...labelledByProps.value,
      ...handlers,
      id: inputId,
      [isInput ? 'checked' : 'aria-checked']: checked.value,
      [isInput ? 'readonly' : 'aria-readonly']: group?.readonly || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled() || undefined,
      [isInput ? 'required' : 'aria-required']: group?.required,
    };

    if (isInput) {
      return {
        ...base,
        name: group?.name,
        type: 'radio',
      };
    }

    return {
      ...base,
      role: 'radio',
      tabindex: checked.value ? '0' : registration?.canReceiveFocus() ? '0' : '-1',
    };
  }

  const inputProps = computed(() => withRefCapture(createBindings(isInputElement(inputEl.value)), inputEl, elementRef));

  return {
    inputEl,
    inputProps,
    isChecked: checked,
    isDisabled: computed(() => isDisabled()),
    labelProps,
  };
}
