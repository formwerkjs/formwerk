import { shallowRef } from 'vue';
import {
  DisabledSchema,
  FormObject,
  FormValidationResult,
  MaybeAsync,
  Path,
  IssueCollection,
  StandardSchema,
  TouchedSchema,
  PathValue,
} from '../types';
import { createEventDispatcher } from '../utils/events';
import { BaseFormContext, SetValueOptions } from './formContext';
import { unsetPath } from '../utils/path';
import { useValidationProvider } from '../validation/useValidationProvider';
import { appendToFormData } from '../utils/formData';
import type { Jsonify } from 'type-fest';
import { FormIdAttr } from '../constants';

export interface ResetState<TValues> {
  value: Partial<TValues>;
  touched: TValues extends FormObject ? Partial<TouchedSchema<TValues>> : Partial<Record<string, boolean>>;
  revalidate?: boolean;
}

export interface FormActionsOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  schema: StandardSchema<TForm, TOutput> | undefined;
  disabled: DisabledSchema<TForm>;
  scrollToInvalidFieldOnSubmit: ScrollIntoViewOptions | boolean;
}

export type ConsumableData<TOutput extends FormObject> = {
  toFormData: () => FormData;
  toObject: () => TOutput;
  toJSON: () => Jsonify<TOutput>;
};

export interface SubmitContext {
  form?: HTMLFormElement;
  event?: Event | SubmitEvent;
}

export interface FormActions<TForm extends FormObject, TOutput extends FormObject> {
  /**
   * Creates a submit handler for the form.
   * @example
   * ```ts
   * const onSubmit = actions.handleSubmit((data, { form }) => {
   *   console.log(data.toObject(), form);
   * });
   * ```
   */
  handleSubmit: (
    onSuccess: (payload: ConsumableData<TOutput>, ctx: SubmitContext) => MaybeAsync<void>,
  ) => (e?: Event) => Promise<void>;

  /**
   * Creates a reset handler for the form.
   * @example
   * ```ts
   * const onReset = handleReset();
   * ```
   */
  handleReset: (afterReset?: () => MaybeAsync<void>) => (e?: Event) => Promise<void>;

  /**
   * Resets the form to its initial state.
   */
  reset(): Promise<void>;

  /**
   *  Resets the form to a specific state.
   */
  reset(state: Partial<ResetState<TForm>>, opts?: SetValueOptions): Promise<void>;

  /**
   * Resets a specific part of the form.
   */
  reset<TPath extends Path<TForm>>(path: TPath): Promise<void>;

  /**
   * Resets a specific part of the form to a specific state.
   */
  reset<TPath extends Path<TForm>>(
    path: TPath,
    state: Partial<ResetState<PathValue<TForm, TPath>>>,
    opts?: SetValueOptions,
  ): Promise<void>;

  /**
   * Validates the form.
   */
  validate: () => Promise<FormValidationResult<TOutput>>;
}

export function useFormActions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>(
  form: BaseFormContext<TForm>,
  { disabled, schema, scrollToInvalidFieldOnSubmit }: FormActionsOptions<TForm, TOutput>,
) {
  const isSubmitting = shallowRef(false);
  const submitAttemptsCount = shallowRef(0);
  const isSubmitAttempted = shallowRef(false);
  const wasSubmitted = shallowRef(false);
  const [dispatchSubmit, onSubmitAttempt] = createEventDispatcher<void>('submit');
  const {
    validate: _validate,
    onValidationDispatch,
    defineValidationRequest,
    onValidationDone,
    dispatchValidateDone,
  } = useValidationProvider({ schema, getValues: () => form.getValues(), type: 'FORM' });
  const requestValidation = defineValidationRequest(updateValidationStateFromResult);

  function handleSubmit<TReturns>(
    onSuccess: (payload: ConsumableData<TOutput>, ctx: SubmitContext) => MaybeAsync<TReturns>,
  ) {
    return async function onSubmit(e?: Event) {
      e?.preventDefault();
      isSubmitting.value = true;
      isSubmitAttempted.value = true;
      submitAttemptsCount.value += 1;

      // No need to wait for this event to propagate, it is used for non-validation stuff like setting touched state.
      dispatchSubmit();
      const { isValid, output, errors } = await validate();

      updateSubmitValidationStateFromResult(errors);

      // Prevent submission if the form has errors
      if (!isValid) {
        isSubmitting.value = false;
        scrollToFirstInvalidField(form.id, scrollToInvalidFieldOnSubmit);
        return;
      }

      const disabledPaths = Object.entries(disabled)
        .filter(([, v]) => !!v)
        .map(([k]) => k)
        .sort((a, b) => b.localeCompare(a)) as (keyof DisabledSchema<TForm>)[];

      for (const path of disabledPaths) {
        unsetPath(output, path, true);
      }

      const result = await onSuccess(withConsumers(output), { event: e, form: e?.target as HTMLFormElement });
      isSubmitting.value = false;
      wasSubmitted.value = true;

      return result;
    };
  }

  function handleReset(afterReset?: () => MaybeAsync<void>) {
    return async function resetHandler(e?: Event) {
      e?.preventDefault();
      await reset();
      await afterReset?.();
    };
  }

  function updateSubmitValidationStateFromResult(errors: IssueCollection[]) {
    form.clearSubmitErrors();
    applySubmitErrors(errors);
  }

  function updateValidationStateFromResult(result: FormValidationResult<TOutput>) {
    form.clearErrors();
    applyErrors(result.errors);
    dispatchValidateDone();

    return result;
  }

  async function validate(): Promise<FormValidationResult<TOutput>> {
    const result = await _validate();
    updateValidationStateFromResult(result);

    return result;
  }

  function applyErrors(errors: IssueCollection[]) {
    for (const entry of errors) {
      form.setErrors(entry.path as Path<TForm>, entry.messages);
    }
  }

  function applySubmitErrors(errors: IssueCollection[]) {
    for (const entry of errors) {
      form.setFieldSubmitErrors(entry.path as Path<TForm>, entry.messages);
    }
  }

  /**
   * Typeguard for checking if a value is a Partial<ResetState<T>>.
   *
   * @template T - Type parameter for ResetState
   * @param value - Value to check
   * @returns True if value has ResetState properties
   */
  function isResetState<T>(value: unknown): value is Partial<ResetState<T>> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      ('value' in value || 'touched' in value || 'revalidate' in value)
    );
  }

  async function reset(): Promise<void>;
  async function reset(state: Partial<ResetState<TForm>>, opts?: SetValueOptions): Promise<void>;
  async function reset<TPath extends Path<TForm>>(path: TPath);
  async function reset<TPath extends Path<TForm>>(
    path: TPath,
    state: Partial<ResetState<PathValue<TForm, TPath>>>,
    opts?: SetValueOptions,
  ): Promise<void>;

  // Implementation signature
  async function reset<TPath extends Path<TForm>>(
    pathOrStateOrUndefined?: TPath | Partial<ResetState<TForm>>,
    stateOrOptsOrUndefined?: Partial<ResetState<PathValue<TForm, TPath>>> | SetValueOptions,
    optsOrUndefined?: SetValueOptions,
  ): Promise<void> {
    /**
     * CASE 1: reset()
     * Reset the form to its initial state.
     */
    if (pathOrStateOrUndefined === undefined) {
      wasSubmitted.value = false;

      form.revertValues();
      form.revertTouched();
      form.revertDirty();
      submitAttemptsCount.value = 0;
      isSubmitAttempted.value = false;

      await validate();

      return Promise.resolve();
    }

    /**
     * CASE 2: reset(state, opts?)
     * Reset the form to a specific state.
     */
    if (isResetState<TForm>(pathOrStateOrUndefined)) {
      const state = pathOrStateOrUndefined;
      const opts = stateOrOptsOrUndefined as SetValueOptions;

      if (state.value) {
        form.setInitialValues(state.value);
      }

      if (state.touched) {
        // Add type assertion here to help TypeScript understand the structure
        form.setInitialTouched(state.touched as Partial<TouchedSchema<TForm>>, opts);
      }

      wasSubmitted.value = false;
      submitAttemptsCount.value = 0;
      isSubmitAttempted.value = false;

      form.revertValues();
      form.revertTouched();
      form.revertDirty();

      if (state.revalidate ?? true) {
        await validate();
        return;
      }

      form.clearErrors();
      form.clearSubmitErrors();

      return Promise.resolve();
    }

    /**
     * Case 3 and 4.
     *
     * Extract the path from the first argument.
     */
    const path = pathOrStateOrUndefined;

    /**
     * CASE 3: reset(path)
     * Reset a specific part of the form.
     */
    if (stateOrOptsOrUndefined === undefined) {
      form.revertValues(pathOrStateOrUndefined as TPath);
      form.revertTouched(pathOrStateOrUndefined as TPath);
      form.revertDirty(pathOrStateOrUndefined as TPath);
      form.clearErrors(pathOrStateOrUndefined as TPath);

      return Promise.resolve();
    }

    /**
     * CASE 4: reset(path, state, opts?)
     * Reset a specific part of the form to a specific state.
     */
    if (isResetState<PathValue<TForm, TPath>>(stateOrOptsOrUndefined)) {
      const state = stateOrOptsOrUndefined;
      const opts = optsOrUndefined;

      if (state.value) {
        // form.setInitialValues(state.value, );
        console.warn('setInitialValues', state.value);
      }

      if (state.touched) {
        // form.setInitialTouched(state.touched, opts);
        console.warn('setInitialTouched', state.touched, opts);
      }

      form.revertValues(path);
      form.revertTouched(path);
      form.revertDirty(path);
      form.clearErrors(path);

      if (state.revalidate ?? true) {
        await validate();
        return;
      }

      form.clearErrors(path);

      return Promise.resolve();
    }
  }

  const actions: FormActions<TForm, TOutput> = {
    handleSubmit,
    handleReset,
    reset,
    validate,
  };

  return {
    actions,
    requestValidation,
    onSubmitAttempt,
    onValidationDispatch,
    onValidationDone,
    isSubmitting,
    submitAttemptsCount,
    wasSubmitted,
    isSubmitAttempted,
  };
}

function withConsumers<TData extends FormObject>(data: TData): ConsumableData<TData> {
  const toObject = () => data;
  const toFormData = () => {
    const formData = new FormData();
    appendToFormData(data, formData);

    return formData;
  };

  function toJSON() {
    return JSON.parse(JSON.stringify(toObject()));
  }

  return {
    toObject,
    toFormData,
    toJSON,
  };
}

function scrollToFirstInvalidField(formId: string, options: ScrollIntoViewOptions | boolean) {
  if (!options) {
    return;
  }

  const scrollOpts =
    typeof options === 'object'
      ? options
      : ({ behavior: 'smooth', block: 'center', inline: 'start' } as ScrollIntoViewOptions);

  const invalidField = document.querySelector(`[aria-invalid="true"][aria-errormessage][${FormIdAttr}="${formId}"]`);
  if (invalidField) {
    invalidField.scrollIntoView(scrollOpts);
  }
}
