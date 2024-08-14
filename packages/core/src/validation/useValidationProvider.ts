import { FormObject, TypedSchema, ValidationResult } from '../types';
import { FormValidationResult } from '../useForm/useFormActions';
import { batchAsync, cloneDeep, withLatestCall } from '../utils/common';
import { createEventDispatcher } from '../utils/events';
import { SCHEMA_BATCH_MS } from '../constants';

interface ValidationProviderOptions<TInput extends FormObject, TOutput extends FormObject = TInput> {
  schema?: TypedSchema<TInput, TOutput>;
  getValues: () => TInput;
}

export function useValidationProvider<TInput extends FormObject, TOutput extends FormObject = TInput>({
  schema,
  getValues,
}: ValidationProviderOptions<TInput, TOutput>) {
  const [dispatchValidate, onValidationDispatch] =
    createEventDispatcher<(pending: Promise<ValidationResult>) => void>('validate');

  /**
   * Validates but tries to not mutate anything if possible.
   */
  async function validate(): Promise<FormValidationResult<TOutput>> {
    const validationQueue: Promise<ValidationResult>[] = [];
    const enqueue = (promise: Promise<ValidationResult>) => validationQueue.push(promise);
    // This is meant to trigger a signal for all fields that can validate themselves to do so.
    // Native validation is sync so no need to wait for pending validators.
    // But field-level and group-level validations are async, so we need to wait for them.
    await dispatchValidate(enqueue);
    const results = await Promise.all(validationQueue);
    const fieldErrors = results.flatMap(r => r.errors).filter(e => e.messages.length);

    // If we are using native validation, then we don't stop the state mutation
    // Because it already has happened, since validations are sourced from the fields.
    if (!schema) {
      return {
        mode: 'native',
        isValid: !fieldErrors.length,
        errors: fieldErrors,
        output: cloneDeep(getValues() as unknown as TOutput),
      };
    }

    const { errors, output } = await schema.parse(getValues());
    const allErrors = [...errors, ...fieldErrors];

    return {
      mode: 'schema',
      isValid: !allErrors.length,
      errors: allErrors,
      output: cloneDeep(output ?? (getValues() as unknown as TOutput)),
    };
  }

  function defineValidationRequest(mutator: (result: FormValidationResult<TOutput>) => void) {
    const requestValidation = withLatestCall(batchAsync(validate, SCHEMA_BATCH_MS), result => {
      mutator(result);

      return result;
    });

    return requestValidation;
  }

  return {
    validate,
    onValidationDispatch,
    defineValidationRequest,
  };
}
