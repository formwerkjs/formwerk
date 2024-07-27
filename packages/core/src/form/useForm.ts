import { InjectionKey, provide, reactive, readonly, toValue } from 'vue';
import { escapePath } from '../utils/path';
import { cloneDeep, merge, uniqId, isPromise } from '../utils/common';
import { FormObject, MaybeAsync, MaybeGetter } from '../types';
import { createFormContext, FormContext } from './formContext';
import { FormTransactionManager, useFormTransactions } from './useFormTransactions';

export interface FormOptions<TForm extends FormObject = FormObject> {
  id: string;
  initialValues: MaybeGetter<MaybeAsync<TForm>>;
}

export interface SetValueOptions {
  mode: 'merge' | 'replace';
}

export interface FormContextWithTransactions<TForm extends FormObject = FormObject>
  extends FormContext<TForm>,
    FormTransactionManager<TForm> {}

export const FormKey: InjectionKey<FormContextWithTransactions<any>> = Symbol('Formwerk FormKey');

export function useForm<TForm extends FormObject>(opts?: Partial<FormOptions<TForm>>) {
  const values = reactive(initializeValues()) as TForm;
  const touched = reactive({});

  function initializeValues(): TForm {
    const initialValues = toValue(opts?.initialValues);
    if (!isPromise(initialValues)) {
      return cloneDeep(initialValues || {}) as TForm;
    }

    initialValues.then(value => {
      setValues(value, { mode: 'merge' });
    });

    return {} as TForm;
  }

  const ctx = createFormContext(opts?.id || uniqId(), values, touched);

  function setValues(newValues: Partial<TForm>, opts?: SetValueOptions) {
    if (opts?.mode === 'merge') {
      merge(values, newValues);

      return;
    }

    // Delete all keys, then set new values
    Object.keys(values).forEach(key => {
      delete values[key];
    });

    // We escape paths automatically
    Object.keys(newValues).forEach(key => {
      ctx.setFieldValue(escapePath(key) as any, newValues[key]);
    });
  }

  const transactionsManager = useFormTransactions(ctx);
  provide(FormKey, {
    ...ctx,
    ...transactionsManager,
  });

  return {
    values: readonly(values),
    context: ctx,
    setFieldValue: ctx.setFieldValue,
    getFieldValue: ctx.getFieldValue,
    isFieldTouched: ctx.isFieldTouched,
    setFieldTouched: ctx.setFieldTouched,
    setValues,
  };
}
