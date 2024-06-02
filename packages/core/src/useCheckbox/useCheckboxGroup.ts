import { InjectionKey, toValue, computed, onBeforeUnmount, reactive, provide } from 'vue';
import { useFieldValue } from '../composables/useFieldValue';
import { useInputValidity } from '../composables/useInputValidity';
import { useLabel } from '../composables/useLabel';
import { useSyncModel } from '../composables/useModelSync';
import {
  Orientation,
  AriaLabelableProps,
  AriaDescribableProps,
  AriaValidatableProps,
  Direction,
  Reactivify,
} from '../types';
import { uniqId, createDescribedByProps } from '../utils/common';

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

  useCheckboxRegistration(checkbox: CheckboxContext): { canReceiveFocus(): boolean };
}

export interface CheckboxContext {
  isDisabled(): boolean;
  setChecked(force?: boolean): boolean;
  isChecked(): boolean;
}

export const CheckboxGroupKey: InjectionKey<CheckboxGroupContext<any>> = Symbol('CheckboxGroupKey');

export interface CheckboxGroupProps<TCheckbox = unknown> {
  orientation?: Orientation;
  dir?: 'ltr' | 'rtl';
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

export function useCheckboxGroup<TCheckbox>(props: Reactivify<CheckboxGroupProps<TCheckbox>>) {
  const groupId = uniqId();
  const checkboxes: CheckboxContext[] = [];
  const { labelProps, labelledByProps } = useLabel({
    for: groupId,
    label: props.label,
  });

  const { fieldValue } = useFieldValue(toValue(props.modelValue));
  useSyncModel({
    model: fieldValue,
    onModelPropUpdated: value => {
      fieldValue.value = value;
    },
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
      dir: toValue(props.dir) ?? 'ltr',
      role: 'group',
      'aria-describedby': describedBy(),
      'aria-invalid': errorMessage.value ? true : undefined,
    };
  });

  function setValue(value: CheckboxGroupValue<TCheckbox>) {
    fieldValue.value = value;
  }

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

    return {
      canReceiveFocus() {
        return checkboxes[0] === checkbox && fieldValue.value === undefined;
      },
    };
  }

  function toggleValue(value: TCheckbox, force?: boolean) {
    const nextValue = [...(fieldValue.value ?? [])];
    // TODO: Better equality checks
    const idx = nextValue.indexOf(value);
    const shouldAdd = force ?? idx === -1;

    if (shouldAdd) {
      nextValue.push(value);
    } else {
      nextValue.splice(idx, 1);
    }

    setValue(nextValue);
  }

  function hasValue(value: TCheckbox) {
    // TODO: Better equality checks
    return (fieldValue.value ?? []).includes(value);
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
