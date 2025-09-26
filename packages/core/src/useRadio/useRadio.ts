import { computed, inject, ref, toValue } from 'vue';
import { hasKeyCode, isEqual, isInputElement, normalizeProps, useUniqId, warn, useCaptureProps } from '../utils/common';
import { AriaInputProps, AriaLabelableProps, InputBaseAttributes, Reactivify, RovingTabIndex } from '../types';
import { useLabel } from '../a11y/useLabel';
import { RadioGroupContext, RadioGroupKey } from './useRadioGroup';
import { FieldTypePrefixes } from '../constants';
import { createDisabledContext } from '../helpers/createDisabledContext';

export interface RadioProps<TValue = string> {
  /**
   * The value associated with this radio button.
   */
  value: TValue;

  /**
   * The label text for the radio button.
   */
  label: string;

  /**
   * Whether the radio button is disabled.
   */
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

export function useRadio<TValue = string>(_props: Reactivify<RadioProps<TValue>>) {
  const props = normalizeProps(_props);
  const inputId = useUniqId(FieldTypePrefixes.RadioButton);
  const group: RadioGroupContext<TValue> | null = inject(RadioGroupKey, null);
  const inputEl = ref<HTMLInputElement>();
  const checked = computed(() => isEqual(group?.modelValue, toValue(props.value)));
  const isDisabled = createDisabledContext(props.disabled);
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

  const isReadOnly = () => group?.readonly ?? false;
  const isMutable = () => !isReadOnly() && !isDisabled.value;

  function focus() {
    inputEl.value?.focus();
  }

  function setChecked() {
    if (!isMutable()) {
      return false;
    }

    group?.setGroupValue(toValue(props.value) as TValue);
    group?.setTouched(true);
    focus();

    return true;
  }

  const registration = group?.useRadioRegistration({
    id: inputId,
    getElem: () => inputEl.value,
    isChecked: () => checked.value,
    isDisabled: () => isDisabled.value,
    setChecked,
  });

  const handlers = {
    onClick(e: Event) {
      if (!isMutable()) {
        e.preventDefault();
        return;
      }

      setChecked();
    },
    onKeydown(e: KeyboardEvent) {
      if (hasKeyCode(e, 'Space')) {
        e.preventDefault();
        setChecked();
      }
    },
    onBlur() {
      group?.setBlurred(true);
    },
  };

  function createBindings(isInput: boolean): RadioDomInputProps | RadioDomProps {
    const base = {
      ...labelledByProps.value,
      ...handlers,
      id: inputId,
      [isInput ? 'checked' : 'aria-checked']: checked.value,
      [isInput ? 'readonly' : 'aria-readonly']: group?.readonly || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled.value || undefined,
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
      tabindex: checked.value ? '0' : registration?.canReceiveFocus() && !isDisabled.value ? '0' : '-1',
    };
  }

  const inputProps = useCaptureProps(() => createBindings(isInputElement(inputEl.value)), inputEl);

  return {
    /**
     * The id of the input element.
     */
    controlId: inputId,
    /**
     * Reference to the input element.
     */
    inputEl,
    /**
     * Props for the input element.
     */
    inputProps,
    /**
     * Whether the radio is checked.
     */
    isChecked: checked,
    /**
     * Whether the radio is disabled.
     */
    isDisabled,
    /**
     * Props for the label element.
     */
    labelProps,
  };
}
