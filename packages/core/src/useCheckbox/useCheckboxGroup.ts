import { InjectionKey, MaybeRefOrGetter, toValue, computed, onBeforeUnmount, reactive, provide } from 'vue';
import { useFieldValue } from '../composables/useFieldValue';
import { useInputValidity } from '../composables/useInputValidity';
import { useLabel } from '../composables/useLabel';
import { useSyncModel } from '../composables/useModelSync';
import { Orientation, AriaLabelableProps, AriaDescribableProps, AriaValidatableProps, Direction } from '../types';
import { uniqId, createDescribedByProps } from '../utils/common';

export type CheckboxGroupValue<TCheckbox> = TCheckbox[];

export interface CheckboxGroupContext<TCheckbox> {
  name: string;
  disabled: boolean;
  readonly: boolean;
  required: boolean;

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
}

export const CheckboxGroupKey: InjectionKey<CheckboxGroupContext<any>> = Symbol('CheckboxGroupKey');

export interface CheckboxGroupProps<TCheckbox = unknown> {
  orientation?: MaybeRefOrGetter<Orientation>;
  dir?: MaybeRefOrGetter<'ltr' | 'rtl'>;
  label: MaybeRefOrGetter<string>;
  description?: MaybeRefOrGetter<string>;

  name?: MaybeRefOrGetter<string>;
  modelValue?: MaybeRefOrGetter<CheckboxGroupValue<TCheckbox>>;

  disabled?: MaybeRefOrGetter<boolean>;
  readonly?: MaybeRefOrGetter<boolean>;
  required?: MaybeRefOrGetter<boolean>;
}

interface CheckboxGroupDomProps extends AriaLabelableProps, AriaDescribableProps, AriaValidatableProps {
  role: 'group';
  dir: Direction;
}

export function useCheckboxGroup<TCheckbox>(props: CheckboxGroupProps<TCheckbox>) {
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

  const context: CheckboxGroupContext<TCheckbox> = reactive({
    name: computed(() => toValue(props.name) ?? groupId),
    disabled: computed(() => toValue(props.disabled) ?? false),
    readonly: computed(() => toValue(props.readonly) ?? false),
    required: computed(() => toValue(props.required) ?? false),
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
    errorMessageProps,
    fieldValue,
    checkboxGroupProps,
    errorMessage,
  };
}
