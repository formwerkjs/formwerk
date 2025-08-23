import { inject, InjectionKey, provide, Ref } from 'vue';
import { useFieldController, FieldController, FieldControllerProps } from './useFieldController';
import { useFieldState, FieldState, FieldStateInit } from './useFieldState';
import { Arrayable, Reactivify, StandardSchema, ValidationResult } from '../types';
import { normalizeProps, warn } from '../utils/common';

export type FormFieldInit<V = unknown> = Reactivify<FieldControllerProps> & Partial<FieldStateInit<V>>;

export type FormFieldProps = FieldControllerProps;

export type FormField<TValue = unknown> = FieldController & FieldState<TValue>;

export const FormFieldKey: InjectionKey<FieldState<unknown>> = Symbol('FormFieldKey');

export interface FieldBaseProps<TValue = unknown> {
  /**
   * The label of the field.
   */
  label: string;

  /**
   * The description text for the field.
   */
  description?: string;

  /**
   * Schema for field validation.
   */
  schema?: StandardSchema<TValue>;
}

export function useFormField<TValue = unknown>(init?: FormFieldInit<TValue>): FormField<TValue> {
  const controllerProps = normalizeProps(init ?? { label: '' });
  const state = useFieldState(init);
  const controller = useFieldController({
    ...controllerProps,
    errorMessage: state.errorMessage,
  });

  const field = {
    ...controller,
    ...state,
  } satisfies FormField<TValue>;

  provide(FormFieldKey, field as FieldState<unknown>);

  return field;
}

export type ExposedField<TValue> = {
  /**
   * Display the error message for the field.
   */
  displayError: () => string | undefined;

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
};

export function useFormFieldContext<TValue = unknown>() {
  return inject(FormFieldKey, null) as FormField<TValue> | null;
}

export function exposeField<TReturns extends object, TValue>(
  obj: TReturns,
  field: FormField<TValue>,
): ExposedField<TValue> & TReturns {
  const exposedField = {
    displayError: field.displayError,
    errorMessage: field.errorMessage,
    errors: field.errors,
    submitErrors: field.submitErrors,
    submitErrorMessage: field.submitErrorMessage,
    fieldValue: field.fieldValue as Ref<TValue>,
    isDirty: field.isDirty,
    isTouched: field.isTouched,
    isValid: field.isValid,
    isDisabled: field.isDisabled,
    setErrors: __DEV__
      ? (messages: Arrayable<string>) => {
          if (field.isDisabled.value) {
            warn('This field is disabled, setting errors will not take effect until the field is enabled.');
          }

          field.setErrors(messages);
        }
      : field.setErrors,
    setTouched: field.setTouched,
    setValue: field.setValue,
    validate: (mutate = true) => field.validate(mutate),
  } satisfies ExposedField<TValue>;

  return {
    ...obj,
    ...exposedField,
  } satisfies ExposedField<TValue> & TReturns;
}
