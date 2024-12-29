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
} from '../types';
import { createEventDispatcher } from '../utils/events';
import { BaseFormContext, SetValueOptions } from './formContext';
import { unsetPath } from '../utils/path';
import { useValidationProvider } from '../validation/useValidationProvider';
import { appendToFormData } from '../utils/formData';
import type { Jsonify } from 'type-fest';
import { FormIdAttr } from '../constants';

export interface ResetState<TForm extends FormObject> {
  values: Partial<TForm>;
  touched: Partial<TouchedSchema<TForm>>;
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
    onSuccess: (payload: ConsumableData<TOutput>, ctx: SubmitContext) => MaybeAsync<unknown>,
  ) => (e?: Event) => Promise<unknown>;
  /**
   * Resets the form to its initial state.
   */
  reset: (state?: Partial<ResetState<TForm>>, opts?: SetValueOptions) => Promise<void>;
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
  const isSubmitAttempt = shallowRef(false);
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
      isSubmitAttempt.value = true;
      submitAttemptsCount.value += 1;

      // No need to wait for this event to propagate, it is used for non-validation stuff like setting touched state.
      dispatchSubmit();
      const { isValid, output } = await validate();
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
      form.setFieldErrors(entry.path as Path<TForm>, entry.messages);
    }
  }

  async function reset(state?: Partial<ResetState<TForm>>, opts?: SetValueOptions) {
    if (state?.values) {
      form.setInitialValues(state.values, opts);
    }

    if (state?.touched) {
      form.setInitialTouched(state.touched, opts);
    }

    wasSubmitted.value = false;

    form.revertValues();
    form.revertTouched();
    submitAttemptsCount.value = 0;

    if (state?.revalidate ?? true) {
      await validate();
      return;
    }

    form.clearErrors();

    return Promise.resolve();
  }

  const actions: FormActions<TForm, TOutput> = {
    handleSubmit,
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
    isSubmitAttempt,
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
