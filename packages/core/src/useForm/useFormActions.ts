import { shallowRef } from 'vue';
import {
  DisabledSchema,
  FormObject,
  MaybeAsync,
  Path,
  TouchedSchema,
  TypedSchema,
  TypedSchemaError,
  ValidationResult,
} from '../types';
import { batchAsync, cloneDeep, withLatestCall } from '../utils/common';
import { createEventDispatcher } from '../utils/events';
import { BaseFormContext, FormValidationMode, SetValueOptions } from './formContext';
import { unsetPath } from '../utils/path';
import { SCHEMA_BATCH_MS } from '../constants';

export interface ResetState<TForm extends FormObject> {
  values: Partial<TForm>;
  touched: Partial<TouchedSchema<TForm>>;
  revalidate?: boolean;
}

export interface FormActionsOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  schema: TypedSchema<TForm, TOutput> | undefined;
  disabled: DisabledSchema<TForm>;
}

export interface FormValidationResult<TOutput extends FormObject = FormObject> extends ValidationResult {
  output: TOutput;
  mode: FormValidationMode;
}

export function useFormActions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>(
  form: BaseFormContext<TForm>,
  { disabled, schema }: FormActionsOptions<TForm, TOutput>,
) {
  const isSubmitting = shallowRef(false);
  const [dispatchSubmit, onSubmitAttempt] = createEventDispatcher<void>('submit');
  const [dispatchValidate, onValidationDispatch] =
    createEventDispatcher<(pending: Promise<ValidationResult>) => void>('form-validate');

  function handleSubmit<TReturns>(onSuccess: (values: TOutput) => MaybeAsync<TReturns>) {
    return async function onSubmit(e: Event) {
      e.preventDefault();
      isSubmitting.value = true;

      // No need to wait for this event to propagate, it is used for non-validation stuff like setting touched state.
      dispatchSubmit();
      const { isValid, output } = await validate();
      // Prevent submission if the form has errors
      if (!isValid) {
        isSubmitting.value = false;

        return;
      }

      const disabledPaths = Object.entries(disabled)
        .filter(([, v]) => !!v)
        .map(([k]) => k)
        .sort((a, b) => b.localeCompare(a)) as (keyof DisabledSchema<TForm>)[];

      for (const path of disabledPaths) {
        unsetPath(output, path, true);
      }

      const result = await onSuccess(output);
      isSubmitting.value = false;

      return result;
    };
  }

  /**
   * Validates but tries to not mutate anything if possible.
   */
  async function _validate(): Promise<FormValidationResult<TOutput>> {
    const validationQueue: Promise<ValidationResult>[] = [];
    const enqueue = (promise: Promise<ValidationResult>) => validationQueue.push(promise);
    // This is meant to trigger a signal for all fields that can validate themselves to do so.
    // Native validation is sync so no need to wait for pending validators.
    // But field-level and group-level validations are async, so we need to wait for them.
    await dispatchValidate(enqueue);
    const fieldErrors = (await Promise.all(validationQueue)).flatMap(r => r.errors).filter(e => e.messages.length);

    // If we are using native validation, then we don't stop the state mutation
    // Because it already has happened, since validations are sourced from the fields.
    if (form.getValidationMode() === 'native' || !schema) {
      return {
        mode: 'native',
        isValid: !fieldErrors.length,
        errors: fieldErrors,
        output: cloneDeep(form.getValues() as unknown as TOutput),
      };
    }

    const { errors, output } = await schema.parse(form.getValues());
    const allErrors = [...errors, ...fieldErrors];

    return {
      mode: 'schema',
      isValid: !allErrors.length,
      errors,
      output: cloneDeep(output ?? (form.getValues() as unknown as TOutput)),
    };
  }

  function updateValidationStateFromResult(result: FormValidationResult<TOutput>) {
    form.clearErrors();
    applyErrors(result.errors);

    return result;
  }

  async function validate(): Promise<FormValidationResult<TOutput>> {
    const result = await _validate();
    updateValidationStateFromResult(result);

    return result;
  }

  function applyErrors(errors: TypedSchemaError[]) {
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

    form.revertValues();
    form.revertTouched();
    if (state?.revalidate) {
      await validate();
      return;
    }

    form.clearErrors();

    return Promise.resolve();
  }

  const requestValidation = withLatestCall(batchAsync(_validate, SCHEMA_BATCH_MS), result => {
    updateValidationStateFromResult(result);

    return result;
  });

  return {
    actions: {
      handleSubmit,
      reset,
      validate,
    },
    requestValidation,
    onSubmitAttempt,
    onValidationDispatch,
    isSubmitting,
  };
}
