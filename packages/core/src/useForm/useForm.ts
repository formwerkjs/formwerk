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
  IssueCollection,
  PathValue,
} from '../types';
import { createFormContext, BaseFormContext, SetValueOptions } from './formContext';
import { FormTransactionManager, useFormTransactions } from './useFormTransactions';
import { ConsumableData, FormActions, ResetState, useFormActions } from './useFormActions';
import { useFormSnapshots } from './formSnapshot';
import { getConfig } from '../config';
import { FieldTypePrefixes } from '../constants';
import { appendToFormData, clearFormData } from '../utils/formData';
import { Arrayable, PartialDeep } from 'type-fest';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { TransparentWrapper } from '../types';

interface _FormProps<TInput extends FormObject> {
  /**
   * The form's unique identifier.
   */
  id?: string;

  /**
   * The initial touched state for form fields.
   */
  initialTouched?: TouchedSchema<TInput>;

  /**
   * The initial dirty state for form fields.
   */
  initialDirty?: DirtySchema<TInput>;

  /**
   * Whether HTML5 validation should be disabled for this form.
   */
  disableHtmlValidation?: TransparentWrapper<boolean>;

  /**
   * Whether the form is disabled.
   */
  disabled?: MaybeRefOrGetter<boolean | undefined>;

  /**
   * Whether the form should scroll to the first invalid field on invalid submission.
   */
  scrollToInvalidFieldOnSubmit?: ScrollIntoViewOptions | boolean;
}

export interface NoSchemaFormProps<TInput extends FormObject> extends _FormProps<TInput> {
  initialValues?: MaybeGetter<MaybeAsync<PartialDeep<TInput>>>;
}

export interface SchemaFormProps<TSchema extends GenericFormSchema>
  extends _FormProps<StandardSchemaV1.InferInput<TSchema>> {
  /**
   * The validation schema for the form.
   */
  schema: TSchema;

  initialValues?: MaybeGetter<MaybeAsync<PartialDeep<StandardSchemaV1.InferInput<TSchema>>>>;
}

export interface FormReturns<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput> {
  /**
   * The current values of the form.
   */
  values: PartialDeep<TInput>;

  /**
   * The form context object, for internal use.
   * @private
   */
  context: FormContext<TInput, TOutput>;

  /**
   * Whether the form is submitting.
   */
  isSubmitting: Ref<boolean>;

  /**
   * Checks if the form is valid, or if a form path is valid. Validity is defined as the absence of errors.
   * @param path - The path to check. If not provided, the form as a whole will be checked.
   */
  isValid(path?: Path<TInput>): boolean;

  /**
   * Whether the form is disabled.
   */
  isDisabled: Ref<boolean>;

  /**
   * The number of times the form has been submitted, regardless of the form's validity.
   */
  submitAttemptsCount: Ref<number>;

  /**
   * Whether the form was submitted, which is true if the form was submitted and the submission was successful.
   */
  wasSubmitted: Ref<boolean>;

  /**
   * Whether the form was submitted, wether the validity or the submission was successful or not.
   */
  isSubmitAttempted: Ref<boolean>;

  /**
   * Checks if the form is dirty, which is true if any field's value has changed from the initial values. Accepts an optional path to check if a specific form path is dirty.
   * @param path - The path to check. If not provided, the form as a whole will be checked.
   */
  isDirty(path?: Path<TInput>): boolean;

  /**
   * Set a form field value by name.
   */
  setValue<TPath extends Path<TInput>>(path: TPath, value: PathValue<TInput, TPath>): void;

  /**
   * Gets the value of a field or a path.
   */
  getValue<TPath extends Path<TInput>>(path: TPath): PathValue<TInput, TPath>;

  /**
   * Checks if the form is touched, which is true if any field has been touched. Accepts an optional path to check if a specific form path is touched.
   * @param path - The path to check. If not provided, the form as a whole will be checked.
   */
  isTouched(path?: Path<TInput>): boolean;

  /**
   * Sets the touched state of the form. Alternatively, pass a path to set the touched state of a specific form path.
   * @param path - The path to set the touched state of. If a boolean is passed, the touched state of all form fields will be set to that value.
   * @param value - The value to set the touched state to.
   */
  setTouched(value: boolean): void;
  setTouched<TPath extends Path<TInput>>(path: TPath, value: boolean): void;

  /**
   * Get the errors for a form field, or the
   */
  getErrors: (path?: Path<TInput>) => string[];

  /**
   * Get the issues for a form field.
   */
  getIssues: (path?: Path<TInput>) => IssueCollection[];

  /**
   * Get the submit errors for a form field.
   */
  getSubmitErrors: (path?: Path<TInput>) => IssueCollection[]; // TODO: Inconsistent naming with return type.

  /**
   * Sets the errors for a form path.
   * @param path - The path to set the errors for.
   * @param message - The message to set the errors to.
   */
  setErrors<TPath extends Path<TInput>>(path: TPath, message: Arrayable<string>): void;
  setErrors<TPath extends Path<TInput>>(issues: IssueCollection<TPath>[]): void;

  /**
   * Handle form submission.
   */
  handleSubmit: (onSubmit: (values: ConsumableData<TOutput>) => void | Promise<void>) => (e?: Event) => Promise<void>;

  /**
   * Reset the form to its initial values
   */
  reset(): Promise<void>;
  reset(state: Partial<ResetState<TInput>>, opts?: SetValueOptions): Promise<void>;
  reset<TPath extends Path<TInput>>(path: TPath): Promise<void>;
  reset<TPath extends Path<TInput>>(
    path: TPath,
    state: Partial<ResetState<PathValue<TInput, TPath>>>,
    opts?: SetValueOptions,
  ): Promise<void>;

  /**
   * Validate the form.
   */
  validate: () => Promise<FormValidationResult<TOutput>>;

  /**
   * Get the error for a form field.
   */
  getError: (path: Path<TInput>) => string | undefined;

  /**
   * Get the submit error for a form field.
   */
  getSubmitError: (path: Path<TInput>) => string | undefined;

  /**
   * Handle form reset.
   */
  handleReset: (afterReset?: () => MaybeAsync<void>) => (e?: Event) => Promise<void>;

  /**
   * Set the value for a form field.
   */
  setValues: (values: PartialDeep<TInput>, opts?: SetValueOptions) => void;

  /**
   * The form props.
   */
  formProps: FormDomProps;
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

export function useForm<TInput extends FormObject>(props?: NoSchemaFormProps<TInput>): FormReturns<TInput>;
export function useForm<TSchema extends GenericFormSchema>(
  props?: SchemaFormProps<TSchema>,
): FormReturns<StandardSchemaV1.InferInput<TSchema>, StandardSchemaV1.InferOutput<TSchema>>;
export function useForm<
  TSchema extends GenericFormSchema,
  TInput extends FormObject = StandardSchemaV1.InferInput<TSchema>,
  TOutput extends FormObject = StandardSchemaV1.InferOutput<TSchema>,
>(props?: NoSchemaFormProps<TInput> | SchemaFormProps<TSchema>): FormReturns<TInput, TOutput> {
  type TResolvedInput = typeof props extends NoSchemaFormProps<TInput> ? TInput : StandardSchemaV1.InferInput<TSchema>;

  const schemaProps = props as SchemaFormProps<TSchema> | undefined;
  const touchedSnapshot = useFormSnapshots(props?.initialTouched);
  const dirtySnapshot = useFormSnapshots(props?.initialDirty);
  const valuesSnapshot = useFormSnapshots<TInput, TOutput>(props?.initialValues as TInput, {
    onAsyncInit,
    schema: schemaProps?.schema as StandardSchema<TInput, TOutput>,
  });

  const id = props?.id || useUniqId(FieldTypePrefixes.Form);
  const isDisabled = createDisabledContext(props?.disabled);
  const isHtmlValidationDisabled = () => props?.disableHtmlValidation ?? getConfig().disableHtmlValidation;
  const values = reactive(cloneDeep(valuesSnapshot.originals.value)) as PartialDeep<TResolvedInput>;
  const touched = reactive(cloneDeep(touchedSnapshot.originals.value)) as TouchedSchema<TResolvedInput>;
  const dirty = reactive(cloneDeep(dirtySnapshot.originals.value)) as DirtySchema<TResolvedInput>;
  const disabled = reactive({}) as DisabledSchema<TResolvedInput>;
  const errors = ref({}) as Ref<ErrorsSchema<TResolvedInput>>;
  const submitErrors = ref({}) as Ref<ErrorsSchema<TResolvedInput>>;

  const ctx = createFormContext<TResolvedInput, TOutput>({
    id,
    values: values as TResolvedInput,
    touched,
    disabled,
    dirty,
    schema: schemaProps?.schema as StandardSchema<TInput, TOutput>,
    errors,
    submitErrors,
    snapshots: {
      values: valuesSnapshot,
      touched: touchedSnapshot,
      dirty: dirtySnapshot,
    },
  });

  function isValid<TPath extends Path<TResolvedInput>>(path?: TPath) {
    const pathErrors = ctx.getErrors(path);

    return pathErrors.length === 0;
  }

  function onAsyncInit(v: TInput) {
    ctx.setValues(v, { behavior: 'merge' });
  }

  const transactionsManager = useFormTransactions(ctx);
  const { actions, isSubmitting, submitAttemptsCount, wasSubmitted, isSubmitAttempted, ...privateActions } =
    useFormActions<TResolvedInput, TOutput>(ctx, {
      disabled,
      schema: schemaProps?.schema as StandardSchema<TResolvedInput, TOutput>,
      scrollToInvalidFieldOnSubmit: props?.scrollToInvalidFieldOnSubmit ?? true,
    });

  function getError<TPath extends Path<TResolvedInput>>(path: TPath): string | undefined {
    return ctx.isPathDisabled(path) ? undefined : ctx.getErrors(path)[0];
  }

  function getSubmitError<TPath extends Path<TResolvedInput>>(path: TPath): string | undefined {
    return ctx.isPathDisabled(path) ? undefined : ctx.getFieldSubmitErrors(path)[0];
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
    values: readonly(values),
    context: ctx as FormContext<TInput, TOutput>,
    isSubmitting,
    isValid,
    isDisabled,
    submitAttemptsCount,
    wasSubmitted,
    isSubmitAttempted,
    isDirty: ctx.isDirty,
    setValue: ctx.setValue,
    getValue: ctx.getValue,
    isTouched: ctx.isTouched,
    setTouched: ctx.setTouched,
    setErrors: ctx.setErrors,
    setValues: ctx.setValues,
    getError,
    getErrors: ctx.getErrors,
    getIssues: ctx.getIssues,
    getSubmitError,
    getSubmitErrors: ctx.getSubmitErrors,
    formProps,
  };

  const form: FormReturns<TInput, TOutput> = {
    ...baseReturns,
    ...actions,
  } as FormReturns<TInput, TOutput>;

  if (__DEV__) {
    // using any until we can figure out how to type this properly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerForm(form as any);
  }

  provide(FormContextKey, form as any);

  return form;
}

export function useFormContext<TInput extends FormObject = FormObject, TOutput extends FormObject = TInput>() {
  const ctx = inject(FormContextKey, null);

  if (__DEV__) {
    if (!ctx) {
      warn('useFormContext must be used within a Formwerk form or one of its descendants.');
    }
  }

  return ctx as FormReturns<TInput, TOutput>;
}
