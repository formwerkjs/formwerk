import { inject, InjectionKey, markRaw, provide, Ref, toValue } from 'vue';
import { useFieldController, FieldController, FieldControllerProps } from './useFieldController';
import { useFieldState, FieldState, FieldStateInit } from './useFieldState';
import {
  AriaDescriptionProps,
  AriaErrorMessageProps,
  AriaLabelProps,
  Arrayable,
  ControlProps,
  Getter,
  NormalizedProps,
  Reactivify,
  ValidationResult,
} from '../types';
import { normalizeProps, warn } from '../utils/common';
import { Simplify } from 'type-fest';

export type FormFieldInit<V = unknown> = Reactivify<FieldControllerProps> & Partial<FieldStateInit<V>>;

export type FormFieldProps = FieldControllerProps;

export type FormField<TValue = unknown> = FieldController & FieldState<TValue>;

export const FormFieldKey: InjectionKey<FieldState<unknown>> = Symbol('FormFieldKey');

export type WithFieldProps<TControlProps extends object> = Simplify<
  Omit<TControlProps, '_field' | 'label'> & {
    label: string;
  }
>;

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

  /**
   * The field instance.
   */
  _field: FormField<TValue>;
};

export function useFormFieldContext<TValue = unknown>() {
  return inject(FormFieldKey, null) as FormField<TValue> | null;
}

export function exposeField<TReturns extends object, TValue>(
  obj: TReturns,
  field: FormField<TValue>,
): ExposedField<TValue> & TReturns {
  return {
    _field: markRaw(field),
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
    labelProps: field.labelProps,
    descriptionProps: field.descriptionProps,
    errorMessageProps: field.errorMessageProps,
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
    ...obj,
  } satisfies ExposedField<TValue> & TReturns;
}

/**
 * Extracts the field init from control props.
 */
export function resolveFieldInit<TValue = unknown, TInitialValue = TValue>(
  props: NoInfer<NormalizedProps<ControlProps<TValue, TInitialValue>, 'schema' | '_field'>>,
  resolveValue?: () => TValue,
): FormFieldInit<TValue> {
  return {
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: resolveValue?.() ?? ((toValue(props.modelValue) ?? toValue(props.value)) as TValue),
    disabled: props.disabled,
    schema: props.schema,
  } satisfies FormFieldInit<TValue>;
}

/**
 * Resolves the field props from the context or creates a new field if none exists.
 */
export function resolveControlField<TValue = unknown, TInitialValue = TValue>(
  props: NoInfer<NormalizedProps<ControlProps<TValue, TInitialValue>, 'schema' | '_field'>>,
  resolveValue?: Getter<TValue>,
): FormField<TValue> {
  return (
    props._field ??
    useFormFieldContext<TValue>() ??
    useFormField<TValue>(resolveFieldInit<TValue, TInitialValue>(props, resolveValue))
  );
}
