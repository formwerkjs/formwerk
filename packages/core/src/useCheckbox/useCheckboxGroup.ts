import { InjectionKey, toValue, computed, onBeforeUnmount, reactive, provide } from 'vue';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import {
  Orientation,
  AriaLabelableProps,
  AriaDescribableProps,
  AriaValidatableProps,
  Direction,
  Reactivify,
} from '../types';
import { useUniqId, createDescribedByProps, normalizeProps, isEqual } from '../utils/common';
import { useLocale } from '../i18n/useLocale';
import { useFormField } from '../form/useFormField';

export type CheckboxGroupValue<TCheckbox> = TCheckbox[];

export type CheckboxGroupState = 'checked' | 'unchecked' | 'mixed';

export interface CheckboxGroupContext<TCheckbox> {
  name: string;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  groupState: CheckboxGroupState;

  readonly modelValue: CheckboxGroupValue<TCheckbox> | undefined;
  setValidity(message: string): void;
  setValue(value: CheckboxGroupValue<TCheckbox>): void;
  hasValue(value: TCheckbox): boolean;
  toggleValue(value: TCheckbox, force?: boolean): void;

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
}

interface CheckboxGroupDomProps extends AriaLabelableProps, AriaDescribableProps, AriaValidatableProps {
  role: 'group';
  dir: Direction;
}

export function useCheckboxGroup<TCheckbox>(_props: Reactivify<CheckboxGroupProps<TCheckbox>>) {
  const props = normalizeProps(_props);
  const groupId = useUniqId('cbg');
  const { direction } = useLocale();
  const checkboxes: CheckboxContext[] = [];
  const { labelProps, labelledByProps } = useLabel({
    for: groupId,
    label: props.label,
  });

  const { fieldValue, setValue } = useFormField({
    path: props.name,
    initialValue: toValue(props.modelValue),
  });

  const { setValidity, errorMessage } = useInputValidity();
  const { describedBy, descriptionProps, errorMessageProps } = createDescribedByProps({
    inputId: groupId,
    errorMessage,
    description: props.description,
  });

  const checkboxGroupProps = computed<CheckboxGroupDomProps>(() => {
    return {
      ...labelledByProps.value,
      dir: toValue(props.dir) ?? direction.value,
      role: 'group',
      'aria-describedby': describedBy(),
      'aria-invalid': errorMessage.value ? true : undefined,
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
    const nextValue = [...(fieldValue.value ?? [])];
    const idx = nextValue.findIndex(v => isEqual(v, value));
    const shouldAdd = force ?? idx === -1;

    if (shouldAdd) {
      nextValue.push(value);
    } else {
      nextValue.splice(idx, 1);
    }

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
    groupState,
    modelValue: fieldValue,
    setValidity,
    setValue,
    useCheckboxRegistration,
    toggleValue,
    hasValue,
  });

  provide(CheckboxGroupKey, context);

  return {
    labelProps,
    descriptionProps,
    groupState,
    errorMessageProps,
    fieldValue,
    checkboxGroupProps,
    errorMessage,
  };
}
