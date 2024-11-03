import { computed, InjectionKey, onMounted, provide, reactive, readonly, Ref, ref } from 'vue';
import { cloneDeep, isEqual, useUniqId } from '../utils/common';
import {
  FormObject,
  MaybeAsync,
  MaybeGetter,
  TouchedSchema,
  DisabledSchema,
  ErrorsSchema,
  Path,
  StandardSchema,
  ValidationResult,
  FormValidationResult,
  GroupValidationResult,
} from '../types';
import { createFormContext, BaseFormContext } from './formContext';
import { FormTransactionManager, useFormTransactions } from './useFormTransactions';
import { useFormActions } from './useFormActions';
import { useFormSnapshots } from './formSnapshot';
import { findLeaf } from '../utils/path';
import { getConfig } from '../config';
import { FieldTypePrefixes } from '../constants';
import { appendToFormData, clearFormData } from '../utils/formData';

export interface FormOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  id: string;
  initialValues: MaybeGetter<MaybeAsync<TForm>>;
  initialTouched: TouchedSchema<TForm>;
  schema: StandardSchema<TForm, TOutput>;
  disableHtmlValidation: boolean;
}

export interface FormContext<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>
  extends BaseFormContext<TForm>,
    FormTransactionManager<TForm> {
  requestValidation(): Promise<FormValidationResult<TOutput>>;
  onSubmitAttempt(cb: () => void): void;
  onValidationDone(cb: () => void): void;
  isHtmlValidationDisabled(): boolean;
  onValidationDispatch(
    cb: (enqueue: (promise: Promise<ValidationResult | GroupValidationResult>) => void) => void,
  ): void;
}

export interface FormDomProps {
  id: string;
}

export const FormKey: InjectionKey<FormContext<any>> = Symbol('Formwerk FormKey');

export function useForm<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>(
  opts?: Partial<FormOptions<TForm, TOutput>>,
) {
  const touchedSnapshot = useFormSnapshots(opts?.initialTouched);
  const valuesSnapshot = useFormSnapshots<TForm, TOutput>(opts?.initialValues, {
    onAsyncInit,
    schema: opts?.schema,
  });

  const id = opts?.id || useUniqId(FieldTypePrefixes.Form);
  const isHtmlValidationDisabled = () => opts?.disableHtmlValidation ?? getConfig().disableHtmlValidation;
  const values = reactive(cloneDeep(valuesSnapshot.originals.value)) as TForm;
  const touched = reactive(cloneDeep(touchedSnapshot.originals.value)) as TouchedSchema<TForm>;
  const disabled = {} as DisabledSchema<TForm>;
  const errors = ref({}) as Ref<ErrorsSchema<TForm>>;

  const ctx = createFormContext({
    id,
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
    ctx.setValues(v, { behavior: 'merge' });
  }

  const transactionsManager = useFormTransactions(ctx);
  const { actions, isSubmitting, ...privateActions } = useFormActions<TForm, TOutput>(ctx, {
    disabled,
    schema: opts?.schema,
  });

  function getErrors() {
    return ctx.getErrors();
  }

  function getError<TPath extends Path<TForm>>(path: TPath): string | undefined {
    return ctx.getFieldErrors(path)[0];
  }

  function displayError(path: Path<TForm>) {
    return ctx.isFieldTouched(path) ? getError(path) : undefined;
  }

  provide(FormKey, {
    ...ctx,
    ...transactionsManager,
    ...privateActions,
    isHtmlValidationDisabled,
  } as FormContext<TForm, TOutput>);

  if (ctx.getValidationMode() === 'schema') {
    onMounted(privateActions.requestValidation);
  }

  function onFormdata(e: FormDataEvent) {
    const form = e.target as HTMLFormElement;
    clearFormData(e.formData);
    appendToFormData(form.__formOut || values, e.formData);
  }

  const onSubmit = actions.handleSubmit((output, { form }) => {
    if (form) {
      form.__formOut = output.toJSON();
      form.submit();
    }
  });

  const formProps = {
    id,
    novalidate: true,
    onSubmit,
    onFormdata,
  };

  return {
    values: readonly(values),
    context: ctx,
    isSubmitting,
    isTouched,
    isDirty,
    isValid,
    isFieldDirty: ctx.isFieldDirty,
    setFieldValue: ctx.setFieldValue,
    getFieldValue: ctx.getFieldValue,
    isFieldTouched: ctx.isFieldTouched,
    setFieldTouched: ctx.setFieldTouched,
    setFieldErrors: ctx.setFieldErrors,
    setValues: ctx.setValues,
    getError,
    displayError,
    getErrors,
    formProps,
    ...actions,
  };
}
