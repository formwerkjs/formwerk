import { computed, InjectionKey, provide, reactive, readonly } from 'vue';
import { cloneDeep, isEqual, useUniqId } from '../utils/common';
import { FormObject, MaybeAsync, MaybeGetter, TouchedSchema, Path } from '../types';
import { createFormContext, FormContext } from './formContext';
import { FormTransactionManager, useFormTransactions } from './useFormTransactions';
import { useFormActions } from './useFormActions';
import { useFormSnapshots } from './formSnapshot';
import { findLeaf } from '../utils/path';

export interface FormOptions<TForm extends FormObject = FormObject> {
  id: string;
  initialValues: MaybeGetter<MaybeAsync<TForm>>;
  initialTouched: TouchedSchema<TForm>;
}

export interface FormContextWithTransactions<TForm extends FormObject = FormObject>
  extends FormContext<TForm>,
    FormTransactionManager<TForm> {
  onSubmitted(cb: () => void): void;
}

export const FormKey: InjectionKey<FormContextWithTransactions<any>> = Symbol('Formwerk FormKey');

export function useForm<TForm extends FormObject = FormObject>(opts?: Partial<FormOptions<TForm>>) {
  const touchedSnapshot = useFormSnapshots(opts?.initialTouched);
  const valuesSnapshot = useFormSnapshots<TForm>(opts?.initialValues, {
    onAsyncInit,
  });

  const values = reactive(cloneDeep(valuesSnapshot.originals.value)) as TForm;
  const touched = reactive(cloneDeep(touchedSnapshot.originals.value)) as TouchedSchema<TForm>;
  const disabled = {} as Partial<Record<Path<TForm>, boolean>>;

  const isTouched = computed(() => {
    return !!findLeaf(touched, l => l === true);
  });

  const isDirty = computed(() => {
    return !isEqual(values, valuesSnapshot.originals.value);
  });

  const ctx = createFormContext({
    id: opts?.id || useUniqId('form'),
    values,
    touched,
    disabled,
    snapshots: {
      values: valuesSnapshot,
      touched: touchedSnapshot,
    },
  });

  function onAsyncInit(v: TForm) {
    ctx.setValues(v, { mode: 'merge' });
  }

  const transactionsManager = useFormTransactions(ctx);
  const { actions, onSubmitted, isSubmitting } = useFormActions(ctx, disabled);

  provide(FormKey, {
    ...ctx,
    ...transactionsManager,
    onSubmitted,
  } as FormContextWithTransactions<TForm>);

  return {
    values: readonly(values),
    context: ctx,
    isSubmitting,
    isTouched,
    isDirty,
    setFieldValue: ctx.setFieldValue,
    getFieldValue: ctx.getFieldValue,
    isFieldTouched: ctx.isFieldTouched,
    setFieldTouched: ctx.setFieldTouched,
    setValues: ctx.setValues,
    ...actions,
  };
}
