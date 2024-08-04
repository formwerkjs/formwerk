import { computed, InjectionKey, provide, reactive, readonly, Ref, ref } from 'vue';
import { cloneDeep, isEqual, useUniqId } from '../utils/common';
import {
  FormObject,
  MaybeAsync,
  MaybeGetter,
  TouchedSchema,
  DisabledSchema,
  ValiditySchema,
  Path,
  TypedSchema,
} from '../types';
import { createFormContext, FormContext } from './formContext';
import { FormTransactionManager, useFormTransactions } from './useFormTransactions';
import { useFormActions } from './useFormActions';
import { useFormSnapshots } from './formSnapshot';
import { findLeaf } from '../utils/path';

export interface FormOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  id: string;
  initialValues: MaybeGetter<MaybeAsync<TForm>>;
  initialTouched: TouchedSchema<TForm>;
  schema: TypedSchema<TForm, TOutput>;
}

export interface FormContextWithTransactions<TForm extends FormObject = FormObject>
  extends FormContext<TForm>,
    FormTransactionManager<TForm> {
  onSubmitted(cb: () => void): void;
}

export const FormKey: InjectionKey<FormContextWithTransactions<any>> = Symbol('Formwerk FormKey');

export function useForm<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>(
  opts?: Partial<FormOptions<TForm, TOutput>>,
) {
  const touchedSnapshot = useFormSnapshots(opts?.initialTouched);
  const valuesSnapshot = useFormSnapshots<TForm>(opts?.initialValues, {
    onAsyncInit,
  });

  const values = reactive(cloneDeep(valuesSnapshot.originals.value)) as TForm;
  const touched = reactive(cloneDeep(touchedSnapshot.originals.value)) as TouchedSchema<TForm>;
  const disabled = {} as DisabledSchema<TForm>;
  const errors = ref({}) as Ref<ValiditySchema<TForm>>;

  const ctx = createFormContext({
    id: opts?.id || useUniqId('form'),
    values,
    touched,
    disabled,
    schema: opts?.schema,
    errors,
    snapshots: {
      values: valuesSnapshot,
      touched: touchedSnapshot,
    },
  });

  const isTouched = computed(() => {
    return !!findLeaf(touched, l => l === true);
  });

  const isDirty = computed(() => {
    return !isEqual(values, valuesSnapshot.originals.value);
  });

  const isValid = computed(() => {
    return !ctx.hasErrors();
  });

  function onAsyncInit(v: TForm) {
    ctx.setValues(v, { mode: 'merge' });
  }

  const transactionsManager = useFormTransactions(ctx);
  const { actions, onSubmitted, isSubmitting } = useFormActions<TForm, TOutput>(ctx, {
    disabled,
    schema: opts?.schema,
  });

  function getError<TPath extends Path<TForm>>(path: TPath): string | undefined {
    return ctx.getFieldErrors(path)[0];
  }

  function displayError(path: Path<TForm>) {
    return ctx.isFieldTouched(path) ? getError(path) : undefined;
  }

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
    isValid,
    setFieldValue: ctx.setFieldValue,
    getFieldValue: ctx.getFieldValue,
    isFieldTouched: ctx.isFieldTouched,
    setFieldTouched: ctx.setFieldTouched,
    setFieldErrors: ctx.setFieldErrors,
    setValues: ctx.setValues,
    getError,
    displayError,
    ...actions,
  };
}
