import { computed, InjectionKey, MaybeRefOrGetter, onMounted, provide, reactive, readonly, Ref, ref } from 'vue';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { cloneDeep, useUniqId } from '../utils/common';
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
} from '../types';
import { createFormContext, BaseFormContext } from './formContext';
import { FormTransactionManager, useFormTransactions } from './useFormTransactions';
import { FormActions, useFormActions } from './useFormActions';
import { useFormSnapshots } from './formSnapshot';
import { getConfig } from '../config';
import { FieldTypePrefixes } from '../constants';
import { appendToFormData, clearFormData } from '../utils/formData';
import { PartialDeep } from 'type-fest';
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

export function useForm<
  TSchema extends GenericFormSchema,
  TInput extends FormObject = StandardSchemaV1.InferInput<TSchema>,
  TOutput extends FormObject = StandardSchemaV1.InferOutput<TSchema>,
>(props?: Partial<FormProps<TSchema, TInput>>) {
  const touchedSnapshot = useFormSnapshots(props?.initialTouched);
  const valuesSnapshot = useFormSnapshots<TInput, TOutput>(props?.initialValues as TInput, {
    onAsyncInit,
    schema: props?.schema as StandardSchema<TInput, TOutput>,
  });

  const id = props?.id || useUniqId(FieldTypePrefixes.Form);
  const isDisabled = createDisabledContext(props?.disabled);
  const isHtmlValidationDisabled = () => props?.disableHtmlValidation ?? getConfig().disableHtmlValidation;
  const values = reactive(cloneDeep(valuesSnapshot.originals.value)) as PartialDeep<TInput>;
  const touched = reactive(cloneDeep(touchedSnapshot.originals.value)) as TouchedSchema<TInput>;
  const disabled = reactive({}) as DisabledSchema<TInput>;
  const errors = ref({}) as Ref<ErrorsSchema<TInput>>;
  const submitErrors = ref({}) as Ref<ErrorsSchema<TInput>>;

  const ctx = createFormContext<TInput, TOutput>({
    id,
    values: values as TInput,
    touched,
    disabled,
    schema: props?.schema as StandardSchema<TInput, TOutput>,
    errors,
    submitErrors,
    snapshots: {
      values: valuesSnapshot,
      touched: touchedSnapshot,
    },
  });

  const isValid = computed(() => {
    return !ctx.hasErrors();
  });

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

  function getErrors<TPath extends Path<TInput>>(path?: TPath) {
    return ctx.getErrors(path);
  }

  function getError<TPath extends Path<TInput>>(path: TPath): string | undefined {
    return ctx.isPathDisabled(path) ? undefined : ctx.getFieldErrors(path)[0];
  }

  function getSubmitErrors() {
    return ctx.getSubmitErrors();
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
     * Whether the form is valid.
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
     * Whether the path is dirty.
     */
    isDirty: ctx.isDirty,
    /**
     * Sets the value of a field.
     */
    setFieldValue: ctx.setFieldValue,
    /**
     * Gets the value of a field.
     */
    getFieldValue: ctx.getFieldValue,
    /**
     * Whether the path is touched.
     */
    isTouched: ctx.isTouched,
    /**
     * Sets the touched state of a field.
     */
    setFieldTouched: ctx.setFieldTouched,
    /**
     * Sets the errors for a field.
     */
    setFieldErrors: ctx.setFieldErrors,
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
    getErrors,
    /**
     * Gets the submit errors for a field.
     */
    getSubmitError,
    /**
     * Gets all the submit errors for the form.
     */
    getSubmitErrors,
    /**
     * Props for the form element.
     */
    formProps,
  };

  return {
    ...baseReturns,
    ...actions,
  } as typeof baseReturns & FormActions<TInput, TOutput>;
}
