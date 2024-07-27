import { InjectionKey, provide, reactive, readonly, Ref, shallowRef, toValue } from 'vue';
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

export function useForm<TForm extends FormObject = FormObject>(opts?: Partial<FormOptions<TForm>>) {
  const { initials, originals } = useInitializeValues<TForm>({
    initialValues: opts?.initialValues,
    onAsyncInit: v => setValues(v, { mode: 'merge' }),
  });

  const values = reactive(cloneDeep(originals.value)) as TForm;
  const touched = reactive({});

  const ctx = createFormContext({
    id: opts?.id || uniqId(),
    values,
    initials,
    originals,
    touched,
  });

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

interface FormInitializerOptions<TForm extends FormObject = FormObject> {
  initialValues: MaybeGetter<MaybeAsync<TForm>>;
  onAsyncInit?: (values: TForm) => void;
}

function useInitializeValues<TForm extends FormObject = FormObject>(opts?: Partial<FormInitializerOptions<TForm>>) {
  // We need two copies of the initial values
  const initials = shallowRef<TForm>({} as TForm) as Ref<TForm>;
  const originals = shallowRef<TForm>({} as TForm) as Ref<TForm>;

  const initialValuesUnref = toValue(opts?.initialValues);
  if (isPromise(initialValuesUnref)) {
    initialValuesUnref.then(inits => {
      initials.value = cloneDeep(inits || {}) as TForm;
      originals.value = cloneDeep(inits || {}) as TForm;
      opts?.onAsyncInit?.(cloneDeep(inits));
    });
  } else {
    initials.value = cloneDeep(initialValuesUnref || {}) as TForm;
    originals.value = cloneDeep(initialValuesUnref || {}) as TForm;
  }

  return {
    initials,
    originals,
  };
}
