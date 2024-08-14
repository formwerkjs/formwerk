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
import { createEventDispatcher } from '../utils/events';
import { BaseFormContext, FormValidationMode, SetValueOptions } from './formContext';
import { unsetPath } from '../utils/path';
import { useValidationProvider } from '../validation/useValidationProvider';

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
  const {
    validate: _validate,
    onValidationDispatch,
    defineValidationRequest,
  } = useValidationProvider({ schema, getValues: () => form.getValues() });
  const requestValidation = defineValidationRequest(updateValidationStateFromResult);

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
