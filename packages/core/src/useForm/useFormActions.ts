import { shallowRef } from 'vue';
import {
  DisabledSchema,
  FormObject,
  FormValidationResult,
  MaybeAsync,
  Path,
  SimpleIssue,
  StandardSchema,
  TouchedSchema,
} from '../types';
import { createEventDispatcher } from '../utils/events';
import { BaseFormContext, SetValueOptions } from './formContext';
import { unsetPath } from '../utils/path';
import { useValidationProvider } from '../validation/useValidationProvider';
import { appendToFormData } from '../utils/formData';

export interface ResetState<TForm extends FormObject> {
  values: Partial<TForm>;
  touched: Partial<TouchedSchema<TForm>>;
  revalidate?: boolean;
}

export interface FormActionsOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  schema: StandardSchema<TForm, TOutput> | undefined;
  disabled: DisabledSchema<TForm>;
}

export type ConsumableData<TOutput extends FormObject> = {
  toFormData: () => FormData;
  toJSON: () => TOutput;
};

export interface SubmitContext {
  form?: HTMLFormElement;
  event?: Event | SubmitEvent;
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

      const result = await onSuccess(withConsumers(output), { event: e, form: e?.target as HTMLFormElement });
      isSubmitting.value = false;

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

  function applyErrors(errors: SimpleIssue[]) {
    for (const entry of errors) {
      form.setFieldErrors(entry.path as Path<TForm>, entry.message ?? []);
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
    if (state?.revalidate ?? true) {
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
    onValidationDone,
    isSubmitting,
  };
}

function withConsumers<TData extends FormObject>(data: TData): ConsumableData<TData> {
  const toJSON = () => data;
  const toFormData = () => {
    const formData = new FormData();
    appendToFormData(data, formData);

    return formData;
  };

  return {
    toJSON,
    toFormData,
  };
}
