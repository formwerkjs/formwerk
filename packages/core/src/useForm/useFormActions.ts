import { shallowRef } from 'vue';
import {
  DisabledSchema,
  FormObject,
  FormValidationResult,
  MaybeAsync,
  Path,
  TouchedSchema,
  TypedSchema,
  TypedSchemaError,
} from '../types';
import { createEventDispatcher } from '../utils/events';
import { BaseFormContext, SetValueOptions } from './formContext';
import { unsetPath } from '../utils/path';
import { useValidationProvider } from '../validation/useValidationProvider';
import { isObject } from '../../../shared/src';
import { isNullOrUndefined } from '../utils/common';

export interface ResetState<TForm extends FormObject> {
  values: Partial<TForm>;
  touched: Partial<TouchedSchema<TForm>>;
  revalidate?: boolean;
}

export interface FormActionsOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  schema: TypedSchema<TForm, TOutput> | undefined;
  disabled: DisabledSchema<TForm>;
}

export type ConsumableData<TOutput extends FormObject> = {
  toFormData: () => FormData;
  toJSON: () => TOutput;
};

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
  } = useValidationProvider({ schema, getValues: () => form.getValues(), type: 'FORM' });
  const requestValidation = defineValidationRequest(updateValidationStateFromResult);

  function handleSubmit<TReturns>(onSuccess: (payload: ConsumableData<TOutput>) => MaybeAsync<TReturns>) {
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

      const result = await onSuccess(withConsumers(output));
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

function appendToFormData(jsonObject: Record<string, any>, formData: FormData, parentKey = ''): FormData {
  for (const key in jsonObject) {
    if (!Object.prototype.hasOwnProperty.call(jsonObject, key)) {
      continue;
    }

    const value = jsonObject[key];
    const newKey = parentKey ? `${parentKey}[${key}]` : key;

    if (value instanceof File) {
      formData.append(newKey, value, value.name);
      continue;
    }

    if (isNullOrUndefined(value)) {
      // Treat nulls as empty strings
      // There might be people who prefer to omit the key entirely, but this is a safer approach
      // Since BE frameworks do convert empty strings to nulls
      formData.append(newKey, '');
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        appendToFormData({ [`${newKey}[${index}]`]: item }, formData);
      });
      continue;
    }

    if (isObject(value) && !(value instanceof File)) {
      appendToFormData(value, formData, newKey);
      continue;
    }

    formData.append(newKey, value);
  }

  return formData;
}
