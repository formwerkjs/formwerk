import { shallowRef } from 'vue';
import { DisabledSchema, FormObject, MaybeAsync, TouchedSchema } from '../types';
import { cloneDeep } from '../utils/common';
import { createEventDispatcher } from '../utils/events';
import { FormContext, SetValueOptions } from './formContext';
import { unsetPath } from '../utils/path';

export interface ResetState<TForm extends FormObject> {
  values: Partial<TForm>;
  touched: Partial<TouchedSchema<TForm>>;
}

export function useFormActions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>(
  form: FormContext<TForm>,
  disabled: DisabledSchema<TForm>,
) {
  const isSubmitting = shallowRef(false);
  const [dispatchSubmit, onSubmitted] = createEventDispatcher<void>('submit');

  function handleSubmit<TReturns>(cb: (values: TOutput) => MaybeAsync<TReturns>) {
    return async function onSubmit(e: Event) {
      e.preventDefault();
      isSubmitting.value = true;
      await dispatchSubmit();

      // Prevent submission if the form has errors
      if (form.hasErrors()) {
        isSubmitting.value = false;

        return;
      }

      // Clone the values to prevent mutation or reactive leaks
      const values = cloneDeep(form.getValues());
      const disabledPaths = Object.entries(disabled)
        .filter(([, v]) => !!v)
        .map(([k]) => k)
        .sort((a, b) => b.localeCompare(a)) as (keyof DisabledSchema<TForm>)[];

      for (const path of disabledPaths) {
        unsetPath(values, path, true);
      }

      const result = await cb(values as unknown as TOutput);

      isSubmitting.value = false;

      return result;
    };
  }

  function reset(state?: Partial<ResetState<TForm>>, opts?: SetValueOptions) {
    if (state?.values) {
      form.setInitialValues(state.values, opts);
    }

    if (state?.touched) {
      form.setInitialTouched(state.touched, opts);
    }

    form.revertValues();
    form.revertTouched();
  }

  return {
    actions: {
      handleSubmit,
      reset,
    },
    onSubmitted,
    isSubmitting,
  };
}
