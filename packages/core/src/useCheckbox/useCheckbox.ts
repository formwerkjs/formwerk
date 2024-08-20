import { computed, inject, nextTick, Ref, ref, toValue } from 'vue';
import {
  createAccessibleErrorMessageProps,
  isEqual,
  isInputElement,
  normalizeProps,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import {
  AriaLabelableProps,
  InputBaseAttributes,
  NormalizedProps,
  Reactivify,
  RovingTabIndex,
  TypedSchema,
} from '../types';
import { useLabel } from '../a11y/useLabel';
import { CheckboxGroupContext, CheckboxGroupKey } from './useCheckboxGroup';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useInputValidity } from '../validation';

export interface CheckboxProps<TValue = string> {
  name?: string;
  label?: string;
  modelValue?: TValue;

  value?: TValue;
  trueValue?: TValue;
  falseValue?: TValue;

  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;

  schema?: TypedSchema<TValue>;
}

export interface CheckboxDomInputProps extends AriaLabelableProps, InputBaseAttributes {
  type: 'checkbox';
  name?: string;
  indeterminate?: boolean;
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
  _props: Reactivify<CheckboxProps<TValue>, 'schema'>,
  elementRef?: Ref<HTMLElement | undefined>,
) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.Checkbox);
  const getTrueValue = createTrueValueGetter(props);
  const getFalseValue = () => (toValue(props.falseValue) as TValue) ?? (false as TValue);
  const group: CheckboxGroupContext<TValue> | null = inject(CheckboxGroupKey, null);
  const inputRef = elementRef || ref<HTMLElement>();
  const field = useCheckboxField(props);
  useInputValidity({ inputRef, field });
  const { fieldValue, isTouched, setTouched, setValue, errorMessage, setErrors } = field;

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

  const { errorMessageProps, accessibleErrorProps } = createAccessibleErrorMessageProps({
    inputId,
    errorMessage,
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

  function createBindings(isInput: boolean): CheckboxDomProps | CheckboxDomInputProps {
    const base = {
      ...labelledByProps.value,
      ...createHandlers(isInput),
      id: inputId,
      [isInput ? 'checked' : 'aria-checked']: checked.value,
      [isInput ? 'required' : 'aria-required']: (group ? group.required : toValue(props.required)) || undefined,
      [isInput ? 'readonly' : 'aria-readonly']: (group ? group.readonly : toValue(props.readonly)) || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled() || undefined,
      ...(group
        ? {}
        : {
            ...accessibleErrorProps.value,
          }),
    };

    if (isInput) {
      return {
        ...base,
        type: 'checkbox',
        name: group?.name || toValue(props.name),
        indeterminate: toValue(props.indeterminate) || false,
      };
    }

    return {
      ...base,
      role: 'checkbox',
      tabindex: toValue(props.disabled) ? '-1' : '0',
    };
  }

  group?.useCheckboxRegistration({
    isDisabled,
    isChecked: () => checked.value,
    setChecked: (force?: boolean) => {
      focus();
      group?.toggleValue(getTrueValue(), force);
      nextTick(() => {
        if (isInputElement(inputRef.value)) {
          setErrors(inputRef.value?.validationMessage ?? '');
        }
      });

      return true;
    },
  });

  const inputProps = computed(() =>
    withRefCapture(createBindings(isInputElement(inputRef.value)), inputRef, elementRef),
  );

  function setChecked(force?: boolean) {
    // Unless this is set to false, you cannot change the value of the checkbox
    if (toValue(props.indeterminate)) {
      return;
    }

    if (group) {
      group?.toggleValue(getTrueValue(), force);

      return;
    }

    setValue(force ? getTrueValue() : getFalseValue());
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
    isChecked: checked,
    errorMessageProps,
    errorMessage,
    isTouched,
    setChecked,
    toggleValue,
    focus,
  };
}

function useCheckboxField<TValue = string>(
  props: NormalizedProps<Reactivify<CheckboxProps<TValue>, 'schema'>, 'schema'>,
) {
  const group: CheckboxGroupContext<TValue> | null = inject(CheckboxGroupKey, null);

  if (group) {
    const getTrueValue = createTrueValueGetter(props);

    return createGroupField(group, getTrueValue);
  }

  return useFormField<TValue>({
    path: props.name,
    initialValue: toValue(props.modelValue) as TValue,
    disabled: props.disabled,
    schema: props.schema,
  });
}

function createGroupField<TValue = unknown>(group: CheckboxGroupContext<TValue>, getTrueValue: () => TValue) {
  function setValue() {
    group.toggleValue(getTrueValue());
  }

  return {
    ...group.field,
    setValue,
  };
}

function createTrueValueGetter<TValue>(props: NormalizedProps<Reactivify<CheckboxProps<TValue>, 'schema'>, 'schema'>) {
  return () => (toValue(props.trueValue) as TValue) ?? (toValue(props.value) as TValue) ?? (true as TValue);
}
