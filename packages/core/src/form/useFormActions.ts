import { shallowRef } from 'vue';
import { DisabledSchema, FormObject, MaybeAsync, Path, TouchedSchema, TypedSchema, TypedSchemaError } from '../types';
import { cloneDeep } from '../utils/common';
import { createEventDispatcher } from '../utils/events';
import { FormContext, SetValueOptions } from './formContext';
import { unsetPath } from '../utils/path';

export interface ResetState<TForm extends FormObject> {
  values: Partial<TForm>;
  touched: Partial<TouchedSchema<TForm>>;
  revalidate?: boolean;
}

export interface FormActionsOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  schema: TypedSchema<TForm, TOutput> | undefined;
  disabled: DisabledSchema<TForm>;
}

export interface FormValidationResult<TOutput extends FormObject = FormObject> {
  isValid: boolean;
  errors: TypedSchemaError[];
  output: TOutput;
}

export function useFormActions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>(
  form: FormContext<TForm>,
  { disabled, schema }: FormActionsOptions<TForm, TOutput>,
) {
  const isSubmitting = shallowRef(false);
  const [dispatchSubmit, onSubmitAttempt] = createEventDispatcher<void>('submit');
  const [dispatchValidate, onValidateTriggered] = createEventDispatcher<void>('validate');

  function handleSubmit<TReturns>(onSuccess: (values: TOutput) => MaybeAsync<TReturns>) {
    return async function onSubmit(e: Event) {
      e.preventDefault();
      isSubmitting.value = true;

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

  async function validate(): Promise<FormValidationResult<TOutput>> {
    if (form.getValidationMode() === 'native' || !schema) {
      await dispatchValidate();

      return {
        isValid: !form.hasErrors(),
        errors: form.getErrors(),
        output: cloneDeep(form.getValues() as unknown as TOutput),
      };
    }

    const { errors, output } = await schema.parse(form.getValues());
    form.clearErrors();

    applyErrors(errors);

    return {
      isValid: !errors.length,
      errors,
      output: cloneDeep(output ?? (form.getValues() as unknown as TOutput)),
    };
  }

  function applyErrors(errors: TypedSchemaError[]) {
    for (const entry of errors) {
      form.setFieldErrors(entry.path as Path<TForm>, entry.errors);
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
    onSubmitAttempt,
    onValidateTriggered,
    isSubmitting,
  };
}
