import { FormObject, MaybeAsync, TouchedSchema } from '../types';
import { cloneDeep } from '../utils/common';
import { createEventDispatcher } from '../utils/events';
import { FormContext, SetValueOptions } from './formContext';

export interface ResetState<TForm extends FormObject> {
  values: Partial<TForm>;
  touched: Partial<TouchedSchema<TForm>>;
}

export function useFormActions<TForm extends FormObject = FormObject>(form: FormContext<TForm>) {
  const [dispatchSubmit, onSubmitted] = createEventDispatcher<void>('submit');

  function handleSubmit<TReturns>(cb: (values: TForm) => MaybeAsync<TReturns>) {
    return async function onSubmit(e: Event) {
      e.preventDefault();
      await dispatchSubmit();
      // Clone the values to prevent mutation or reactive leaks
      const result = await cb(cloneDeep(form.getValues()));

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
  };
}
