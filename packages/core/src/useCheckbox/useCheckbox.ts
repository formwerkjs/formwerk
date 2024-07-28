import { Ref, computed, inject, nextTick, ref, toValue } from 'vue';
import { isEqual, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { AriaLabelableProps, Reactivify, InputBaseAttributes, RovingTabIndex } from '../types';
import { useLabel } from '../a11y/useLabel';
import { CheckboxGroupContext, CheckboxGroupKey } from './useCheckboxGroup';
import { useFormField } from '../form/useFormField';
import { FieldTypePrefixes } from '../constants';

export interface CheckboxProps<TValue = string> {
  name?: string;
  label?: string;
  modelValue?: TValue;
  disabled?: boolean;
  trueValue?: TValue;
  falseValue?: TValue;
  indeterminate?: boolean;
}

export interface CheckboxDomInputProps extends AriaLabelableProps, InputBaseAttributes {
  type: 'checkbox';
}

export interface CheckboxDomProps extends AriaLabelableProps {
  tabindex: RovingTabIndex;
  role: 'checkbox';
  'aria-checked'?: boolean;
  'aria-readonly'?: boolean;
  'aria-disabled'?: boolean;
  'aria-required'?: boolean;
}

export function useCheckbox<TValue = string>(
  _props: Reactivify<CheckboxProps<TValue>>,
  elementRef?: Ref<HTMLInputElement | undefined>,
) {
  const props = normalizeProps(_props);
  const inputId = useUniqId(FieldTypePrefixes.Checkbox);
  const getTrueValue = () => (toValue(props.trueValue) as TValue) ?? (true as TValue);
  const getFalseValue = () => (toValue(props.falseValue) as TValue) ?? (false as TValue);
  const group: CheckboxGroupContext<TValue> | null = inject(CheckboxGroupKey, null);
  const inputRef = elementRef || ref<HTMLInputElement>();
  const { fieldValue, setValue, isTouched, setTouched } = group
    ? createGroupField(group, getTrueValue)
    : useFormField<TValue>({ path: props.name, initialValue: toValue(props.modelValue) as TValue });

  const checked = computed({
    get() {
      if (group) {
        return group.hasValue(getTrueValue());
      }

      return isEqual(fieldValue.value, getTrueValue());
    },
    set(value: boolean) {
      setChecked(value);
    },
  });

  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputRef,
  });

  function createHandlers(isInput: boolean) {
    const baseHandlers = {
      onClick(e: Event) {
        if (toValue(props.disabled) || toValue(props.indeterminate)) {
          if (isInput) {
            e.stopPropagation();
            e.preventDefault();
          }
          return;
        }

        toggleValue();
        setTouched(true);
      },
      onKeydown(e: KeyboardEvent) {
        if (toValue(props.disabled)) {
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          toggleValue();
          setTouched(true);
        }
      },
      onBlur() {
        setTouched(true);
      },
    };

    if (isInput) {
      return {
        ...baseHandlers,
        onInvalid() {
          group?.setValidity(inputRef.value?.validationMessage ?? '');
        },
      };
    }

    return baseHandlers;
  }

  const isDisabled = () => toValue(props.disabled || group?.disabled) ?? false;

  function focus() {
    if (toValue(props.disabled)) {
      return;
    }

    inputRef.value?.focus();
  }

  function createBindings(isInput: boolean) {
    return {
      ...labelledByProps.value,
      ...createHandlers(isInput),
      id: inputId,
      [isInput ? 'checked' : 'aria-checked']: checked.value,
      [isInput ? 'readonly' : 'aria-readonly']: group?.readonly || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled() || undefined,
      [isInput ? 'required' : 'aria-required']: group?.required,
    };
  }

  group?.useCheckboxRegistration({
    isDisabled,
    isChecked: () => checked.value,
    setChecked: (force?: boolean) => {
      focus();
      group?.toggleValue(getTrueValue(), force);
      nextTick(() => {
        group?.setValidity(inputRef.value?.validationMessage ?? '');
      });

      return true;
    },
  });

  const inputProps = computed<CheckboxDomInputProps>(() =>
    withRefCapture(
      {
        type: 'checkbox',
        name: group?.name || props.name,
        indeterminate: toValue(props.indeterminate) || false,
        ...createBindings(true),
      },
      inputRef,
      elementRef,
    ),
  );

  const checkboxProps = computed<CheckboxDomProps>(() =>
    withRefCapture(
      {
        role: 'checkbox',
        tabindex: toValue(props.disabled) ? '-1' : '0',
        ...createBindings(false),
      },
      inputRef,
      elementRef,
    ),
  );

  function setChecked(force?: boolean) {
    // Unless this is set to false, you cannot change the value of the checkbox
    if (toValue(props.indeterminate)) {
      return;
    }

    group?.toggleValue(getTrueValue(), force);
  }

  function toggleValue(force?: boolean) {
    // Unless this is set to false, you cannot change the value of the checkbox
    if (toValue(props.indeterminate)) {
      return;
    }

    const shouldTrue = force ?? !checked.value;
    setValue(shouldTrue ? getTrueValue() : getFalseValue());
  }

  return {
    fieldValue,
    inputRef,
    labelProps,
    inputProps,
    checkboxProps,
    isChecked: checked,
    isTouched,
    setChecked,
    toggleValue,
    focus,
  };
}

function createGroupField<TValue = unknown>(group: CheckboxGroupContext<TValue>, getTrueValue: () => TValue) {
  const fieldValue = computed(() => group.modelValue as TValue);
  const isTouched = computed(() => group.isTouched);
  function setValue() {
    group.toggleValue(getTrueValue());
  }

  function setTouched(touched: boolean) {
    group.setTouched(touched);
  }

  return {
    fieldValue: fieldValue as Ref<TValue | undefined>,
    isTouched: isTouched as Ref<boolean>,
    setValue,
    setTouched,
  };
}
