import { InjectionKey, provide, reactive, readonly, toRaw } from 'vue';
import { getFromPath, isPathSet, setInPath } from '../utils/path';
import { cloneDeep, merge, uniqId } from '../utils/common';
import { FormObject, Path, PathValue } from '../types';

export interface FormOptions<TForm extends FormObject = FormObject> {
  id: string;
  initialValues: TForm;
}

export interface SetValueOptions {
  mode: 'merge' | 'replace';
}

export interface FormContext<TForm extends FormObject = FormObject> {
  id: string;
  getFieldValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  setFieldValue<TPath extends Path<TForm>>(path: TPath, value: PathValue<TForm, TPath> | undefined): void;
  setFieldTouched<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  isFieldTouched<TPath extends Path<TForm>>(path: TPath): boolean;
  isFieldSet<TPath extends Path<TForm>>(path: TPath): boolean;
  getValues: () => TForm;
}

export const FormKey: InjectionKey<FormContext<any>> = Symbol('Formwerk FormKey');

export function useForm<TForm extends FormObject>(opts?: Partial<FormOptions<TForm>>) {
  const values = reactive(cloneDeep(opts?.initialValues ?? {})) as TForm;
  const touched = reactive({});

  function setFieldValue<TPath extends Path<TForm>>(path: TPath, value: PathValue<TForm, TPath> | undefined) {
    setInPath(values, path, cloneDeep(value));
  }

  function setFieldTouched<TPath extends Path<TForm>>(path: TPath, value: boolean) {
    setInPath(touched, path, value);
  }

  function getFieldValue<TPath extends Path<TForm>>(path: TPath) {
    return getFromPath(values, path) as PathValue<TForm, TPath>;
  }

  function isFieldTouched<TPath extends Path<TForm>>(path: TPath) {
    return !!getFromPath(touched, path);
  }

  function isFieldSet<TPath extends Path<TForm>>(path: TPath) {
    return isPathSet(values, path);
  }

  function setValues(newValues: Partial<TForm>, opts?: SetValueOptions) {
    if (opts?.mode === 'merge') {
      merge(values, newValues);

      return;
    }

    // Delete all keys, then set new values
    Object.keys(values).forEach(key => {
      delete values[key];
    });

    Object.keys(newValues).forEach(key => {
      setFieldValue(key as any, newValues[key]);
    });
  }

  const ctx: FormContext<TForm> = {
    id: opts?.id ?? uniqId(),
    getValues: () => toRaw(values) as TForm,
    setFieldValue,
    setFieldTouched,
    getFieldValue,
    isFieldTouched,
    isFieldSet,
  };

  provide(FormKey, ctx);

  return {
    values: readonly(values),
    context: ctx,
    setFieldValue,
    getFieldValue,
    isFieldTouched,
    setValues,
  };
}
