import { computed, inject, nextTick, Ref, ref, toValue } from 'vue';
import {
  createAccessibleErrorMessageProps,
  hasKeyCode,
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
  StandardSchema,
} from '../types';
import { useLabel } from '../a11y/useLabel';
import { CheckboxGroupContext, CheckboxGroupKey } from './useCheckboxGroup';
import { FormField, useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useInputValidity } from '../validation';
import { exposeField } from '../utils/exposers';

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
  standalone?: boolean;

  schema?: StandardSchema<TValue>;

  disableHtmlValidation?: boolean;
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
  const group: CheckboxGroupContext<TValue> | null = toValue(props.standalone) ? null : inject(CheckboxGroupKey, null);
  const inputEl = elementRef || ref<HTMLElement>();
  const field = useCheckboxField(props);
  if (!group) {
    useInputValidity({
      inputEl,
      field,
      events: ['blur', 'click', ['keydown', e => hasKeyCode(e, 'Space')]],
      disableHtmlValidation: props.disableHtmlValidation,
    });
  }
  const { fieldValue, setTouched, setValue, errorMessage, setErrors, isDisabled } = field;

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
    targetRef: inputEl,
  });

  const { errorMessageProps, accessibleErrorProps } = createAccessibleErrorMessageProps({
    inputId,
    errorMessage,
  });

  const isReadOnly = () => (toValue(props.readonly) || group?.readonly) ?? false;
  const isMutable = () => !isDisabled.value && !isReadOnly() && !toValue(props.indeterminate);

  function createHandlers(isInput: boolean) {
    const baseHandlers = {
      onClick(e: Event) {
        if (!isMutable()) {
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
        if (!isMutable()) {
          return;
        }

        if (hasKeyCode(e, 'Space')) {
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

  function focus() {
    if (toValue(props.disabled)) {
      return;
    }

    inputEl.value?.focus();
  }

  function createBindings(isInput: boolean): CheckboxDomProps | CheckboxDomInputProps {
    const base = {
      ...labelledByProps.value,
      ...createHandlers(isInput),
      id: inputId,
      [isInput ? 'checked' : 'aria-checked']: checked.value,
      [isInput ? 'required' : 'aria-required']: (group ? group.required : toValue(props.required)) || undefined,
      [isInput ? 'readonly' : 'aria-readonly']: isReadOnly() || undefined,
      [isInput ? 'disabled' : 'aria-disabled']: isDisabled.value || undefined,
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
      tabindex: isDisabled.value ? '-1' : '0',
    };
  }

  group?.useCheckboxRegistration({
    id: inputId,
    getElem: () => inputEl.value,
    isDisabled: () => isDisabled.value,
    isChecked: () => checked.value,
    setChecked: (force?: boolean) => {
      if (!isMutable()) {
        return false;
      }

      focus();
      group?.toggleValue(getTrueValue(), force);
      nextTick(() => {
        if (isInputElement(inputEl.value)) {
          setErrors(inputEl.value?.validationMessage ?? '');
        }
      });

      return true;
    },
  });

  const inputProps = computed(() => withRefCapture(createBindings(isInputElement(inputEl.value)), inputEl, elementRef));

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

  const isGrouped = !!group;

  return {
    errorMessageProps,
    inputEl,
    inputProps,
    isChecked: checked,
    isGrouped,
    labelProps,
    toggle: toggleValue,
    ...exposeField(field as FormField<TValue>),
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
    errors: computed(() => []),
    errorMessage: computed(() => ''),
    displayError: () => undefined,
    setValue,
  };
}

function createTrueValueGetter<TValue>(props: NormalizedProps<Reactivify<CheckboxProps<TValue>, 'schema'>, 'schema'>) {
  return () => (toValue(props.trueValue) as TValue) ?? (toValue(props.value) as TValue) ?? (true as TValue);
}
