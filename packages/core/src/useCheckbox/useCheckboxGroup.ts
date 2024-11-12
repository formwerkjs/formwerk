import { InjectionKey, toValue, computed, onBeforeUnmount, reactive, provide, markRaw, ref } from 'vue';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import {
  AriaLabelableProps,
  AriaDescribableProps,
  AriaValidatableProps,
  Direction,
  Reactivify,
  Arrayable,
  StandardSchema,
} from '../types';
import {
  useUniqId,
  createDescribedByProps,
  normalizeProps,
  isEqual,
  createAccessibleErrorMessageProps,
  toggleValueSelection,
  removeFirst,
  isInputElement,
  hasKeyCode,
  warn,
} from '../utils/common';
import { useLocale } from '../i18n';
import { FormField, useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { exposeField } from '../utils/exposers';

export type CheckboxGroupValue<TCheckbox> = TCheckbox[];

export type CheckboxGroupState = 'checked' | 'unchecked' | 'mixed';

export interface CheckboxRegistration {
  id: string;
  getElem(): HTMLElement | undefined;
  isDisabled(): boolean;
  setChecked(force?: boolean): boolean;
  isChecked(): boolean;
}

export interface CheckboxGroupContext<TCheckbox> {
  name: string;
  readonly: boolean;
  required: boolean;
  field: FormField<CheckboxGroupValue<TCheckbox>>;
  groupState: CheckboxGroupState;

  readonly modelValue: CheckboxGroupValue<TCheckbox> | undefined;
  readonly isTouched: boolean;

  setErrors(message: Arrayable<string>): void;
  hasValue(value: TCheckbox): boolean;
  toggleValue(value: TCheckbox, force?: boolean): void;
  setTouched(touched: boolean): void;

  useCheckboxRegistration(checkbox: CheckboxRegistration): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CheckboxGroupKey: InjectionKey<CheckboxGroupContext<any>> = Symbol('CheckboxGroupKey');

export interface CheckboxGroupProps<TCheckbox = unknown> {
  dir?: Direction;
  label: string;
  description?: string;

  name?: string;
  modelValue?: CheckboxGroupValue<TCheckbox>;

  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;

  schema?: StandardSchema<CheckboxGroupValue<TCheckbox>>;

  disableHtmlValidation?: boolean;
}

interface CheckboxGroupDomProps extends AriaLabelableProps, AriaDescribableProps, AriaValidatableProps {
  role: 'group';
  dir: Direction;
}

export function useCheckboxGroup<TCheckbox>(_props: Reactivify<CheckboxGroupProps<TCheckbox>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const groupId = useUniqId(FieldTypePrefixes.CheckboxGroup);
  const { direction } = useLocale();
  const checkboxes = ref<CheckboxRegistration[]>([]);
  const { labelProps, labelledByProps } = useLabel({
    for: groupId,
    label: props.label,
  });

  const field = useFormField({
    path: props.name,
    initialValue: toValue(props.modelValue),
    schema: props.schema,
    disabled: props.disabled,
  });

  const { validityDetails, updateValidity } = useInputValidity({
    field,
    inputEl: computed(() => checkboxes.value.map(v => v.getElem())),
    events: ['blur', 'click', ['keydown', e => hasKeyCode(e, 'Space')]],
    groupValidityBehavior: 'some',
    disableHtmlValidation: props.disableHtmlValidation,
  });

  const { fieldValue, setValue, isTouched, setTouched, errorMessage, isDisabled } = field;
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

  function useCheckboxRegistration(checkbox: CheckboxRegistration) {
    const id = checkbox.id;
    checkboxes.value.push(checkbox);

    onBeforeUnmount(() => {
      removeFirst(checkboxes.value, reg => reg.id === id);
    });
  }

  function toggleValue(value: TCheckbox, force?: boolean) {
    if (isDisabled.value || toValue(props.readonly)) {
      return;
    }

    const nextValue = toggleValueSelection(fieldValue.value ?? [], value, force);

    setValue(nextValue);
    if (checkboxes.value.some(c => !isInputElement(c.getElem()))) {
      updateValidity();
    }
  }

  function hasValue(value: TCheckbox) {
    return (fieldValue.value ?? []).some(v => isEqual(v, value));
  }

  const groupState = computed<CheckboxGroupState>({
    get() {
      if (!fieldValue.value || !fieldValue.value.length) {
        return 'unchecked';
      }

      if (fieldValue.value.length > 0 && fieldValue.value.length < checkboxes.value.length) {
        return 'mixed';
      }

      return 'checked';
    },
    set(value: CheckboxGroupState) {
      if (value === 'mixed') {
        if (__DEV__) {
          warn('You cannot set the group state to "mixed"');
        }
        return;
      }

      checkboxes.value.forEach(c => c.setChecked(value === 'checked'));
    },
  });

  const context: CheckboxGroupContext<TCheckbox> = reactive({
    name: computed(() => toValue(props.name) ?? groupId),
    readonly: computed(() => toValue(props.readonly) ?? false),
    required: computed(() => toValue(props.required) ?? false),
    field: markRaw(field),
    groupState,
    modelValue: fieldValue,
    isTouched,
    setErrors: field.setErrors,
    useCheckboxRegistration,
    toggleValue,
    hasValue,
    setTouched,
  });

  provide(CheckboxGroupKey, context);

  return {
    descriptionProps,
    errorMessageProps,
    groupProps,
    groupState,
    labelProps,
    validityDetails,
    ...exposeField(field),
  };
}
