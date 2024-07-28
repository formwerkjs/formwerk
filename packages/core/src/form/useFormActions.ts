import { FormObject, MaybeAsync } from '../types';
import { cloneDeep } from '../utils/common';
import { FormContext, SetValueOptions } from './formContext';

export function useFormActions<TForm extends FormObject = FormObject>(form: FormContext<TForm>) {
  function handleSubmit<TReturns>(cb: (values: TForm) => MaybeAsync<TReturns>) {
    return async function onSubmit(e: Event) {
      e.preventDefault();

      // Clone the values to prevent mutation or reactive leaks
      const result = await cb(cloneDeep(form.getValues()));

      return result;
    };
  }

  function reset(newValues?: Partial<TForm>, opts?: SetValueOptions) {
    if (newValues) {
      form.setInitialValues(newValues, opts);
    }

    form.revertValues();
  }

  return {
    handleSubmit,
    reset,
  };
}
