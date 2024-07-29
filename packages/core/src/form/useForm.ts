import { InjectionKey, provide, reactive, readonly, Ref, shallowRef, toValue } from 'vue';
import { cloneDeep, useUniqId, isPromise } from '../utils/common';
import { FormObject, MaybeAsync, MaybeGetter } from '../types';
import { createFormContext, FormContext } from './formContext';
import { FormTransactionManager, useFormTransactions } from './useFormTransactions';
import { useFormActions } from './useFormActions';

export interface FormOptions<TForm extends FormObject = FormObject> {
  id: string;
  initialValues: MaybeGetter<MaybeAsync<TForm>>;
}

export interface FormContextWithTransactions<TForm extends FormObject = FormObject>
  extends FormContext<TForm>,
    FormTransactionManager<TForm> {}

export const FormKey: InjectionKey<FormContextWithTransactions<any>> = Symbol('Formwerk FormKey');

export function useForm<TForm extends FormObject = FormObject>(opts?: Partial<FormOptions<TForm>>) {
  const { initials, originals } = useInitializeValues<TForm>({
    initialValues: opts?.initialValues,
    onAsyncInit,
  });

  const values = reactive(cloneDeep(originals.value)) as TForm;
  const touched = reactive({});

  const ctx = createFormContext({
    id: opts?.id || useUniqId('form'),
    values,
    initials,
    originals,
    touched,
  });

  function onAsyncInit(v: TForm) {
    ctx.setValues(v, { mode: 'merge' });
  }

  const transactionsManager = useFormTransactions(ctx);
  const actions = useFormActions(ctx);

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
    setValues: ctx.setValues,
    ...actions,
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
