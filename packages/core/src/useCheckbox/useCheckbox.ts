import { Ref, computed, inject, ref, toValue } from 'vue';
import { uniqId, withRefCapture } from '../utils/common';
import { AriaLabelableProps, Reactivify, InputBaseAttributes, RovingTabIndex } from '../types';
import { useLabel } from '../composables/useLabel';
import { CheckboxGroupContext, CheckboxGroupKey } from './useCheckboxGroup';
import { useFieldValue } from '../composables/useFieldValue';
import { useSyncModel } from '../composables/useModelSync';

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
  props: Reactivify<CheckboxProps<TValue>>,
  elementRef?: Ref<HTMLInputElement | undefined>,
) {
  const inputId = uniqId();
  const getTrueValue = () => toValue(props.trueValue) ?? (true as TValue);
  const getFalseValue = () => toValue(props.falseValue) ?? (false as TValue);
  const group: CheckboxGroupContext<TValue> | null = inject(CheckboxGroupKey, null);
  const inputRef = elementRef || ref<HTMLInputElement>();
  const fieldValue = group
    ? computed({
        get() {
          return group.modelValue as TValue;
        },
        set() {
          // TODO: WARN HERE SINCE CHECKBOX IS GROUPED, SO NO POINT IN TRYING TO CHANGE ITS FIELD VALUE
          group.toggleValue(getTrueValue());
        },
      })
    : useFieldValue<TValue>(getFalseValue()).fieldValue;

  if (!group) {
    useSyncModel({
      model: fieldValue,
      onModelPropUpdated(value) {
        fieldValue.value = value;
      },
    });
  }

  const checked = computed({
    get() {
      if (group) {
        return group.hasValue(getTrueValue());
      }

      // TODO: BETTER EQUALITY CHECK
      return fieldValue.value === getTrueValue();
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
      onClick() {
        toggleValue();
      },
      onKeydown(e: KeyboardEvent) {
        if (e.code === 'Space') {
          e.preventDefault();
          toggleValue();
        }
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
    inputRef.value?.focus();
  }

  function createBindings(isInput: boolean) {
    return {
      ...labelledByProps.value,
      ...createHandlers(isInput),
      id: inputId,
      [isInput ? 'checked' : 'aria-checked']: checked.value || undefined,
      [isInput ? 'readonly' : 'aria-readonly']: group?.readonly || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled() || undefined,
      [isInput ? 'required' : 'aria-required']: group?.required,
    };
  }

  // const registration = group?.useCheckboxRegistration({
  //   isDisabled,
  //   setChecked: (force?: boolean) => {
  //     focus();
  //     group?.toggleValue(getTrueValue(), force);
  //     nextTick(() => {
  //       group?.setValidity(inputRef.value?.validationMessage ?? '');
  //     });

  //     return true;
  //   },
  // });

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
        tabindex: '0',
        ...createBindings(false),
      },
      inputRef,
      elementRef,
    ),
  );

  function setChecked(force?: boolean) {
    group?.toggleValue(getTrueValue(), force);
  }

  function toggleValue(force?: boolean) {
    const shouldTrue = force ?? !checked.value;
    fieldValue.value = shouldTrue ? getTrueValue() : getFalseValue();
  }

  return {
    fieldValue,
    inputRef,
    labelProps,
    inputProps,
    checkboxProps,
    isChecked: checked,
    setChecked,
    toggleValue,
    focus,
  };
}
