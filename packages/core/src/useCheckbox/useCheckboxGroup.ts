import { InjectionKey, toValue, computed, onBeforeUnmount, reactive, provide, markRaw } from 'vue';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import {
  Orientation,
  AriaLabelableProps,
  AriaDescribableProps,
  AriaValidatableProps,
  Direction,
  Reactivify,
  Arrayable,
  TypedSchema,
} from '../types';
import {
  useUniqId,
  createDescribedByProps,
  normalizeProps,
  isEqual,
  createAccessibleErrorMessageProps,
  toggleValueSelection,
} from '../utils/common';
import { useLocale } from '../i18n/useLocale';
import { FormField, useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useErrorDisplay } from '../useFormField/useErrorDisplay';

export type CheckboxGroupValue<TCheckbox> = TCheckbox[];

export type CheckboxGroupState = 'checked' | 'unchecked' | 'mixed';

export interface CheckboxGroupContext<TCheckbox> {
  name: string;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  field: FormField<CheckboxGroupValue<TCheckbox>>;
  groupState: CheckboxGroupState;

  readonly modelValue: CheckboxGroupValue<TCheckbox> | undefined;
  readonly isTouched: boolean;

  setErrors(message: Arrayable<string>): void;
  setValue(value: CheckboxGroupValue<TCheckbox>): void;
  hasValue(value: TCheckbox): boolean;
  toggleValue(value: TCheckbox, force?: boolean): void;
  setTouched(touched: boolean): void;

  useCheckboxRegistration(checkbox: CheckboxContext): void;
}

export interface CheckboxContext {
  isDisabled(): boolean;
  setChecked(force?: boolean): boolean;
  isChecked(): boolean;
}

export const CheckboxGroupKey: InjectionKey<CheckboxGroupContext<any>> = Symbol('CheckboxGroupKey');

export interface CheckboxGroupProps<TCheckbox = unknown> {
  orientation?: Orientation;
  dir?: Direction;
  label: string;
  description?: string;

  name?: string;
  modelValue?: CheckboxGroupValue<TCheckbox>;

  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;

  schema?: TypedSchema<CheckboxGroupValue<TCheckbox>>;
}

interface CheckboxGroupDomProps extends AriaLabelableProps, AriaDescribableProps, AriaValidatableProps {
  role: 'group';
  dir: Direction;
}

export function useCheckboxGroup<TCheckbox>(_props: Reactivify<CheckboxGroupProps<TCheckbox>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const groupId = useUniqId(FieldTypePrefixes.CheckboxGroup);
  const { direction } = useLocale();
  const checkboxes: CheckboxContext[] = [];
  const { labelProps, labelledByProps } = useLabel({
    for: groupId,
    label: props.label,
  });

  const field = useFormField({
    path: props.name,
    initialValue: toValue(props.modelValue),
    schema: props.schema,
  });

  const { displayError } = useErrorDisplay(field);
  const { validityDetails } = useInputValidity({ field });
  const { fieldValue, setValue, isTouched, setTouched, errorMessage } = field;
  const { describedByProps, descriptionProps } = createDescribedByProps({
    inputId: groupId,
    description: props.description,
  });
  const { accessibleErrorProps, errorMessageProps } = createAccessibleErrorMessageProps({
    inputId: groupId,
    errorMessage,
  });

  const groupProps = computed<CheckboxGroupDomProps>(() => {
    return {
      ...labelledByProps.value,
      ...describedByProps.value,
      ...accessibleErrorProps.value,
      dir: toValue(props.dir) ?? direction.value,
      role: 'group',
    };
  });

  function registerCheckbox(checkbox: CheckboxContext) {
    checkboxes.push(checkbox);
  }

  function unregisterCheckbox(checkbox: CheckboxContext) {
    const idx = checkboxes.indexOf(checkbox);
    if (idx >= 0) {
      checkboxes.splice(idx, 1);
    }
  }

  function useCheckboxRegistration(checkbox: CheckboxContext) {
    registerCheckbox(checkbox);
    onBeforeUnmount(() => {
      unregisterCheckbox(checkbox);
    });
  }

  function toggleValue(value: TCheckbox, force?: boolean) {
    const nextValue = toggleValueSelection(fieldValue.value ?? [], value, force);

    setValue(nextValue);
  }

  function hasValue(value: TCheckbox) {
    return (fieldValue.value ?? []).some(v => isEqual(v, value));
  }

  const groupState = computed<CheckboxGroupState>(() => {
    if (!fieldValue.value || !fieldValue.value.length) {
      return 'unchecked';
    }

    if (fieldValue.value.length > 0 && fieldValue.value.length < checkboxes.length) {
      return 'mixed';
    }

    return 'checked';
  });

  const context: CheckboxGroupContext<TCheckbox> = reactive({
    name: computed(() => toValue(props.name) ?? groupId),
    disabled: computed(() => toValue(props.disabled) ?? false),
    readonly: computed(() => toValue(props.readonly) ?? false),
    required: computed(() => toValue(props.required) ?? false),
    field: markRaw(field),
    groupState,
    modelValue: fieldValue,
    isTouched,
    setErrors: field.setErrors,
    setValue,
    useCheckboxRegistration,
    toggleValue,
    hasValue,
    setTouched,
  });

  provide(CheckboxGroupKey, context);

  return {
    labelProps,
    descriptionProps,
    groupState,
    errorMessageProps,
    fieldValue,
    groupProps,
    errorMessage,
    isTouched,
    errors: field.errors,
    isValid: field.isValid,
    validityDetails,

    setValue,
    setTouched,
    setErrors: field.setErrors,
    displayError,
  };
}
