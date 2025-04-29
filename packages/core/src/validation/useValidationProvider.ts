import {
  AnyValidationResult,
  FormObject,
  FormValidationResult,
  GroupValidationResult,
  IssueCollection,
  StandardSchema,
  ValidationResult,
} from '../types';
import { batchAsync, cloneDeep, combineIssues, combineStandardIssues, withLatestCall } from '../utils/common';
import { createEventDispatcher } from '../utils/events';
import { SCHEMA_BATCH_MS } from '../constants';
import { prefixPath, setInPath } from '../utils/path';

type AggregatorResult<TOutput extends FormObject> = FormValidationResult<TOutput> | GroupValidationResult<TOutput>;

interface ValidationProviderOptions<
  TInput extends FormObject,
  TOutput extends FormObject,
  TType extends AggregatorResult<TOutput>['type'],
> {
  type: TType;
  schema?: StandardSchema<TInput, TOutput>;
  getValues: () => TInput;
  getPath?: () => string;
}

export function useValidationProvider<
  TInput extends FormObject,
  TOutput extends FormObject,
  TType extends AggregatorResult<TOutput>['type'],
  TResult extends AggregatorResult<TOutput> & { type: TType },
>({ schema, getValues, type, getPath }: ValidationProviderOptions<TInput, TOutput, TType>) {
  const [dispatchValidate, onValidationDispatch] =
    createEventDispatcher<(pending: Promise<ValidationResult>) => void>('validate');
  const [dispatchValidateDone, onValidationDone] = createEventDispatcher<void>('validate-done');

  /**
   * Validates but tries to not mutate anything if possible.
   */
  async function validate(): Promise<TResult> {
    const validationQueue: Promise<AnyValidationResult>[] = [];
    const enqueue = (promise: Promise<AnyValidationResult>) => validationQueue.push(promise);
    // This is meant to trigger a signal for all fields that can validate themselves to do so.
    // Native validation is sync so no need to wait for pending validators.
    // But field-level and group-level validations are async, so we need to wait for them.
    await dispatchValidate(enqueue);
    const results = await Promise.all(validationQueue);
    const fieldIssues: IssueCollection[] = results
      .flatMap(r => r.errors.map(e => ({ ...e, path: r.path || e.path })))
      .filter(e => e.messages.length);

    // If we are using native validation, then we don't stop the state mutation
    // Because it already has happened, since validations are sourced from the fields.
    if (!schema) {
      return createValidationResult({
        isValid: !fieldIssues.length,
        errors: fieldIssues,
        output: stitchOutput(getValues() as unknown as TOutput, results),
      });
    }

    const result = await schema['~standard']['validate'](getValues());
    let errors: IssueCollection[] = combineStandardIssues(result.issues || []);
    const prefix = getPath?.();
    if (prefix) {
      errors = errors.map(e => {
        return {
          messages: e.messages,
          path: prefixPath(prefix, e.path) || '',
        };
      });
    }

    const allErrors = combineIssues([...errors, ...fieldIssues]);
    const output = 'value' in result ? result.value : undefined;

    dispatchValidateDone();

    return createValidationResult({
      isValid: !allErrors.length,
      errors: allErrors,
      output: stitchOutput(output ?? (getValues() as unknown as TOutput), results),
    });
  }

  function defineValidationRequest(mutator: (result: TResult) => void) {
    return withLatestCall(batchAsync(validate, SCHEMA_BATCH_MS), result => {
      mutator(result);

      return result;
    });
  }

  function createValidationResult(result: Omit<AggregatorResult<TOutput>, 'mode' | 'type'>): TResult {
    const base = {
      output: result.output,
      errors: result.errors,
      isValid: result.isValid,
    };

    if (type === 'FORM') {
      return {
        type,
        mode: schema ? 'schema' : 'aggregate',
        ...base,
      } as TResult;
    }

    return {
      type: 'GROUP',
      path: getPath?.() || '',
      mode: schema ? 'schema' : 'aggregate',
      ...base,
    } as TResult;
  }

  function stitchOutput(base: TOutput, results: (ValidationResult | GroupValidationResult)[]): TOutput {
    const all = cloneDeep(base);
    // Make sure we start with groups first since it may override individual fields
    const sorted = [...results].sort((a, b) => {
      if (a.type === b.type) {
        return 0;
      }

      return a.type === 'FIELD' ? 1 : -1;
    });

    for (const result of sorted) {
      const hasOutput = 'output' in result;
      // Pathless fields will be dropped
      if (!result.path || !hasOutput) {
        continue;
      }

      setInPath(all, result.path, result.output);
    }

    return all;
  }

  return {
    validate,
    onValidationDispatch,
    onValidationDone,
    defineValidationRequest,
    dispatchValidateDone,
  };
}
