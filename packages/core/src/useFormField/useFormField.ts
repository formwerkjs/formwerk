import { Ref, toValue } from 'vue';
import { useFieldController, FieldController, FieldControllerProps } from './useFieldController';
import { useFieldState, FieldState, FieldStateInit } from './useFieldState';
import {
  AriaDescriptionProps,
  AriaErrorMessageProps,
  AriaLabelProps,
  Arrayable,
  ControlProps,
  NormalizedProps,
  Reactivify,
  ValidationResult,
} from '../types';
import { normalizeProps, warn } from '../utils/common';
import { Simplify } from 'type-fest';
import { registerField } from '@formwerk/devtools';

export type FormFieldInit<V = unknown> = Reactivify<FieldControllerProps> & Partial<FieldStateInit<V>>;

export type FormFieldProps = FieldControllerProps;

export type FormField<TValue = unknown> = FieldController & {
  state: FieldState<TValue>;
};

export type WithFieldProps<TControlProps extends object> = Simplify<
  Omit<TControlProps, '_field'> & {
    /**
     * The label of the field.
     */
    label: string;

    /**
     * The description of the field.
     */
    description?: string | undefined;
  }
>;

export function useFormField<TValue = unknown>(
  init?: FormFieldInit<TValue>,
  constrolType: string = 'Field',
): FormField<TValue> {
  const controllerProps = normalizeProps(init ?? { label: '' });
  const state = useFieldState<TValue>(init);
  const controller = useFieldController({
    ...controllerProps,
    errorMessage: state.errorMessage,
  });

  if (__DEV__) {
    registerField(state, controller.controlType ?? constrolType);
  }

  return {
    ...controller,
    state,
  } satisfies FormField<TValue>;
}

/**
 * Extracts the field init from control props.
 */
export function getFieldInit<TValue = unknown, TInitialValue = TValue>(
  props: NormalizedProps<WithFieldProps<ControlProps<TValue, TInitialValue>>, 'schema'>,
  resolveValue?: () => TValue,
): Partial<FormFieldInit<TValue>> {
  return {
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: resolveValue?.() ?? ((toValue(props.modelValue) ?? toValue(props.value)) as TValue),
    disabled: props.disabled,
    schema: props.schema,
  } satisfies FormFieldInit<TValue>;
}

export type ExposedField<TValue> = {
  /**
   * The error message for the field.
   */
  errorMessage: Ref<string | undefined>;

  /**
   * The errors for the field.
   */
  errors: Ref<string[]>;
  /**
   * The errors for the field from the last submit attempt.
   */
  submitErrors: Ref<string[]>;
  /**
   * The error message for the field from the last submit attempt.
   */
  submitErrorMessage: Ref<string | undefined>;
  /**
   * The value of the field.
   */
  fieldValue: Ref<TValue>;

  /**
   * Whether the field is dirty.
   */
  isDirty: Ref<boolean>;

  /**
   * Whether the field is touched.
   */
  isTouched: Ref<boolean>;

  /**
   * Whether the field is valid.
   */
  isValid: Ref<boolean>;

  /**
   * Whether the field is disabled.
   */
  isDisabled: Ref<boolean>;

  /**
   * Sets the errors for the field.
   */
  setErrors: (messages: Arrayable<string>) => void;

  /**
   * Sets the touched state for the field.
   */
  setTouched: (touched: boolean) => void;

  /**
   * Sets the value for the field.
   */
  setValue: (value: TValue) => void;

  /**
   * Validates the field.
   * @param mutate - Whether to set errors on the field as a result of the validation call, defaults to `true`.
   */
  validate: (mutate?: boolean) => Promise<ValidationResult>;

  /**
   * Props for the label element.
   */
  labelProps: Ref<AriaLabelProps>;

  /**
   * Props for the description element.
   */
  descriptionProps: Ref<AriaDescriptionProps>;

  /**
   * Props for the error message element.
   */
  errorMessageProps: Ref<AriaErrorMessageProps>;
};

export function exposeField<TReturns extends object, TValue>(
  obj: TReturns,
  field: FormField<TValue>,
): ExposedField<TValue> & TReturns {
  return {
    errorMessage: field.state.errorMessage,
    errors: field.state.errors,
    submitErrors: field.state.submitErrors,
    submitErrorMessage: field.state.submitErrorMessage,
    fieldValue: field.state.fieldValue as Ref<TValue>,
    isDirty: field.state.isDirty,
    isTouched: field.state.isTouched,
    isValid: field.state.isValid,
    isDisabled: field.state.isDisabled,
    labelProps: field.labelProps,
    descriptionProps: field.descriptionProps,
    errorMessageProps: field.errorMessageProps,
    setErrors: __DEV__
      ? (messages: Arrayable<string>) => {
          if (field.state.isDisabled.value) {
            warn('This field is disabled, setting errors will not take effect until the field is enabled.');
          }

          field.state.setErrors(messages);
        }
      : field.state.setErrors,
    setTouched: field.state.setTouched,
    setValue: field.state.setValue,
    validate: (mutate = true) => field.state.validate(mutate),
    ...obj,
  } satisfies ExposedField<TValue> & TReturns;
}
