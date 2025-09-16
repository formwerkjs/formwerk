import { computed, inject, nextTick, toValue, shallowRef } from 'vue';
import { registerField } from '@formwerk/devtools';
import { hasKeyCode, isEqual, isInputElement, normalizeProps, useUniqId, useCaptureProps } from '../utils/common';
import {
  AriaLabelableProps,
  InputBaseAttributes,
  NormalizedProps,
  Reactivify,
  RovingTabIndex,
  StandardSchema,
} from '../types';
import { useLabel, useErrorMessage } from '../a11y';
import { CheckboxGroupContext, CheckboxGroupKey } from './useCheckboxGroup';
import { useFormField, exposeField, FormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useInputValidity } from '../validation';

export interface CheckboxProps<TValue = boolean> {
  /**
   * The name/path of the checkbox field.
   */
  name?: string;

  /**
   * The label for the checkbox.
   */
  label: string;

  /**
   * The current value of the checkbox.
   */
  modelValue?: TValue;

  /**
   * The value to use when part of a checkbox group.
   */
  value?: TValue;

  /**
   * The value to use when checked.
   */
  trueValue?: TValue;

  /**
   * The value to use when unchecked.
   */
  falseValue?: TValue;

  /**
   * Whether the checkbox is required.
   */
  required?: boolean;

  /**
   * Whether the checkbox is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the checkbox is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the checkbox is in an indeterminate state.
   */
  indeterminate?: boolean;

  /**
   * Whether the checkbox should operate independently of any checkbox group.
   */
  standalone?: boolean;

  /**
   * The validation schema for the checkbox.
   */
  schema?: StandardSchema<TValue>;

  /**
   * Whether HTML5 validation should be disabled for this checkbox.
   */
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  disableHtmlValidation?: Boolean;
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

export function useCheckbox<TValue = string>(_props: Reactivify<CheckboxProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.Checkbox);
  const getTrueValue = createTrueValueGetter(props);
  const getFalseValue = () => (toValue(props.falseValue) as TValue) ?? (false as TValue);
  const group: CheckboxGroupContext<TValue> | null = toValue(props.standalone) ? null : inject(CheckboxGroupKey, null);
  const inputEl = shallowRef<HTMLElement>();
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

  const { errorMessageProps, accessibleErrorProps } = useErrorMessage({
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

  const inputProps = useCaptureProps(() => createBindings(isInputElement(inputEl.value)), inputEl);

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

  if (__DEV__) {
    registerField(field, 'Checkbox');
  }

  return exposeField(
    {
      /**
       * Props for the error message element.
       */
      errorMessageProps,
      /**
       * Reference to the input element.
       */
      inputEl,
      /**
       * Props for the input element.
       */
      inputProps,
      /**
       * Whether the checkbox is checked.
       */
      isChecked: checked,
      /**
       * Whether the checkbox is grouped.
       */
      isGrouped,
      /**
       * Props for the label element.
       */
      labelProps,
      /**
       * Toggles the value of the checkbox.
       */
      toggle: toggleValue,
    },
    field as FormField<TValue>,
  );
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
    setValue,
  };
}

function createTrueValueGetter<TValue>(props: NormalizedProps<Reactivify<CheckboxProps<TValue>, 'schema'>, 'schema'>) {
  return () => (toValue(props.trueValue) as TValue) ?? (toValue(props.value) as TValue) ?? (true as TValue);
}
