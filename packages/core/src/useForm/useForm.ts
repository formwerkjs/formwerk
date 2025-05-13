import { inject, InjectionKey, MaybeRefOrGetter, onMounted, provide, reactive, readonly, Ref, ref } from 'vue';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { registerForm } from '@formwerk/devtools';
import { cloneDeep, useUniqId, warn } from '../utils/common';
import {
  FormObject,
  MaybeAsync,
  MaybeGetter,
  TouchedSchema,
  DisabledSchema,
  ErrorsSchema,
  Path,
  ValidationResult,
  FormValidationResult,
  GroupValidationResult,
  GenericFormSchema,
  StandardSchema,
  DirtySchema,
} from '../types';
import { createFormContext, BaseFormContext } from './formContext';
import { FormTransactionManager, useFormTransactions } from './useFormTransactions';
import { FormActions, useFormActions } from './useFormActions';
import { useFormSnapshots } from './formSnapshot';
import { getConfig } from '../config';
import { FieldTypePrefixes } from '../constants';
import { appendToFormData, clearFormData } from '../utils/formData';
import { PartialDeep, Simplify } from 'type-fest';
import { createDisabledContext } from '../helpers/createDisabledContext';

export interface FormProps<
  TSchema extends GenericFormSchema,
  TInput extends FormObject = StandardSchemaV1.InferInput<TSchema>,
> {
  /**
   * The form's unique identifier.
   */
  id?: string;

  /**
   * The initial values for the form fields.
   */
  initialValues?: MaybeGetter<MaybeAsync<PartialDeep<StandardSchemaV1.InferInput<TSchema>>>>;
  /**
   * The initial touched state for form fields.
   */
  initialTouched?: TouchedSchema<TInput>;

  /**
   * The initial dirty state for form fields.
   */
  initialDirty?: DirtySchema<TInput>;

  /**
   * The validation schema for the form.
   */
  schema?: TSchema;

  /**
   * Whether HTML5 validation should be disabled for this form.
   */
  disableHtmlValidation?: boolean;

  /**
   * Whether the form is disabled.
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Whether the form should scroll to the first invalid field on invalid submission.
   */
  scrollToInvalidFieldOnSubmit?: ScrollIntoViewOptions | boolean;
}

export interface FormContext<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput>
  extends BaseFormContext<TInput>,
    FormTransactionManager<TInput> {
  requestValidation(): Promise<FormValidationResult<TOutput>>;
  onSubmitAttempt(cb: () => void): void;
  onValidationDone(cb: () => void): void;
  isHtmlValidationDisabled(): boolean;
  onValidationDispatch(
    cb: (enqueue: (promise: Promise<ValidationResult | GroupValidationResult>) => void) => void,
  ): void;
}

export interface FormDomProps {
  id: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FormKey: InjectionKey<FormContext<any>> = Symbol('Formwerk FormKey');

export const FormContextKey: InjectionKey<FormReturns & FormActions<any, any>> = Symbol('Formwerk FormContextKey');

export function useForm<
  TSchema extends GenericFormSchema,
  TInput extends FormObject = StandardSchemaV1.InferInput<TSchema>,
  TOutput extends FormObject = StandardSchemaV1.InferOutput<TSchema>,
>(props?: Partial<FormProps<TSchema, TInput>>) {
  const touchedSnapshot = useFormSnapshots(props?.initialTouched);
  const dirtySnapshot = useFormSnapshots(props?.initialDirty);
  const valuesSnapshot = useFormSnapshots<TInput, TOutput>(props?.initialValues as TInput, {
    onAsyncInit,
    schema: props?.schema as StandardSchema<TInput, TOutput>,
  });

  const id = props?.id || useUniqId(FieldTypePrefixes.Form);
  const isDisabled = createDisabledContext(props?.disabled);
  const isHtmlValidationDisabled = () => props?.disableHtmlValidation ?? getConfig().disableHtmlValidation;
  const values = reactive(cloneDeep(valuesSnapshot.originals.value)) as PartialDeep<TInput>;
  const touched = reactive(cloneDeep(touchedSnapshot.originals.value)) as TouchedSchema<TInput>;
  const dirty = reactive(cloneDeep(dirtySnapshot.originals.value)) as DirtySchema<TInput>;
  const disabled = reactive({}) as DisabledSchema<TInput>;
  const errors = ref({}) as Ref<ErrorsSchema<TInput>>;
  const submitErrors = ref({}) as Ref<ErrorsSchema<TInput>>;

  const ctx = createFormContext<TInput, TOutput>({
    id,
    values: values as TInput,
    touched,
    disabled,
    dirty,
    schema: props?.schema as StandardSchema<TInput, TOutput>,
    errors,
    submitErrors,
    snapshots: {
      values: valuesSnapshot,
      touched: touchedSnapshot,
      dirty: dirtySnapshot,
    },
  });

  function isValid<TPath extends Path<TInput>>(path?: TPath) {
    const pathErrors = ctx.getErrors(path);

    return pathErrors.length === 0;
  }

  function onAsyncInit(v: TInput) {
    ctx.setValues(v, { behavior: 'merge' });
  }

  const transactionsManager = useFormTransactions(ctx);
  const { actions, isSubmitting, submitAttemptsCount, wasSubmitted, isSubmitAttempted, ...privateActions } =
    useFormActions<TInput, TOutput>(ctx, {
      disabled,
      schema: props?.schema as StandardSchema<TInput, TOutput>,
      scrollToInvalidFieldOnSubmit: props?.scrollToInvalidFieldOnSubmit ?? true,
    });

  function getError<TPath extends Path<TInput>>(path: TPath): string | undefined {
    return ctx.isPathDisabled(path) ? undefined : ctx.getErrors(path)[0];
  }

  function getSubmitError<TPath extends Path<TInput>>(path: TPath): string | undefined {
    return ctx.isPathDisabled(path) ? undefined : ctx.getFieldSubmitErrors(path)[0];
  }

  function displayError(path: Path<TInput>) {
    return ctx.isTouched(path) && !ctx.isPathDisabled(path) ? getError(path) : undefined;
  }

  provide(FormKey, {
    ...ctx,
    ...transactionsManager,
    ...privateActions,
    isHtmlValidationDisabled,
  } as FormContext<TInput, TOutput>);

  if (ctx.getValidationMode() === 'schema') {
    onMounted(privateActions.requestValidation);
  }

  function onFormdata(e: FormDataEvent) {
    const form = e.target as HTMLFormElement;
    clearFormData(e.formData);
    appendToFormData(form.__formOut || values, e.formData);
  }

  const onSubmit = actions.handleSubmit((output, { form }) => {
    if (form) {
      form.__formOut = output.toObject();
      form.submit();
    }
  });

  const formProps = {
    id,
    novalidate: true,
    onSubmit,
    onFormdata,
  };

  const baseReturns = {
    /**
     * The current values of the form.
     */
    values: readonly(values),
    /**
     * The form context object, for internal use.
     * @private
     */
    context: ctx,
    /**
     * Whether the form is submitting.
     */
    isSubmitting,
    /**
     * Checks if the form is valid, or if a form path is valid. Validity is defined as the absence of errors.
     * @param path - The path to check. If not provided, the form as a whole will be checked.
     */
    isValid,
    /**
     * Whether the form is disabled.
     */
    isDisabled,
    /**
     * The number of times the form has been submitted, regardless of the form's validity.
     */
    submitAttemptsCount,
    /**
     * Whether the form was submitted, which is true if the form was submitted and the submission was successful.
     */
    wasSubmitted,
    /**
     * Whether the form was submitted, wether the validity or the submission was successful or not.
     */
    isSubmitAttempted,
    /**
     * Checks if the form is dirty, which is true if any field's value has changed from the initial values. Accepts an optional path to check if a specific form path is dirty.
     * @param path - The path to check. If not provided, the form as a whole will be checked.
     */
    isDirty: ctx.isDirty,
    /**
     * Sets the value of a field.
     */
    setValue: ctx.setValue,
    /**
     * Gets the value of a field.
     */
    getValue: ctx.getValue,
    /**
     * Checks if the form is touched, which is true if any field has been touched. Accepts an optional path to check if a specific form path is touched.
     * @param path - The path to check. If not provided, the form as a whole will be checked.
     */
    isTouched: ctx.isTouched,
    /**
     * Sets the touched state of the form. Alternatively, pass a path to set the touched state of a specific form path.
     * @param path - The path to set the touched state of. If a boolean is passed, the touched state of all form fields will be set to that value.
     * @param value - The value to set the touched state to.
     */
    setTouched: ctx.setTouched,
    /**
     * Sets the errors for a form path.
     * @param path - The path to set the errors for.
     * @param message - The message to set the errors to.
     */
    setErrors: ctx.setErrors,
    /**
     * Sets the values of the form.
     */
    setValues: ctx.setValues,
    /**
     * Gets the errors for a field.
     */
    getError,
    /**
     * Displays an error for a field.
     */
    displayError,
    /**
     * Gets all the errors for the form.
     */
    getErrors: ctx.getErrors,

    /**
     * Gets all the issues for the form. Issues are more detailed than errors, they contain the path and all the messages for a path.
     */
    getIssues: ctx.getIssues,

    /**
     * Gets the submit errors for a field.
     */
    getSubmitError,
    /**
     * Gets all the submit errors for the form.
     */
    getSubmitErrors: ctx.getSubmitErrors,
    /**
     * Props for the form element.
     */
    formProps,
  };

  const form = {
    ...baseReturns,
    ...actions,
  };

  if (__DEV__) {
    // using any until we can figure out how to type this properly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerForm(form as any);
  }

  provide(FormContextKey, form as any);

  return form as typeof baseReturns & FormActions<TInput, TOutput>;
}

/**
 * Just a utility type helper to get the return type of the useForm composable.
 */
export type FormReturns = Simplify<ReturnType<typeof useForm>>;

export function useFormContext<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput>() {
  const ctx = inject(FormContextKey, null);

  if (__DEV__) {
    if (!ctx) {
      warn('useFormContext must be used within a Formwerk form or one of its descendants.');
    }
  }

  return ctx as FormReturns & FormActions<TInput, TOutput>;
}
