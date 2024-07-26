import { InjectionKey, provide, reactive } from 'vue';
import { getFromPath, isPathSet, setInPath } from '../utils/path';
import { cloneDeep, uniqId } from '../utils/common';

export interface FormOptions {
  id: string;
  initialValues: Record<string, any>;
}

export interface FormContext {
  id: string;
  getFieldValue: (path: string) => any;
  setFieldValue: (path: string, value: any) => void;
  setFieldTouched: (path: string, value: boolean) => void;
  isFieldTouched: (path: string) => boolean;
  isFieldSet: (path: string) => boolean;
  getValues: () => Record<string, any>;
}

export const FormKey: InjectionKey<FormContext> = Symbol('Formwerk FormKey');

export function useForm(opts?: Partial<FormOptions>) {
  const values = reactive(cloneDeep(opts?.initialValues ?? {}));
  const touched = reactive({});

  function setFieldValue(path: string, value: any) {
    setInPath(values, path, cloneDeep(value));
  }

  function setFieldTouched(path: string, value: boolean) {
    setInPath(touched, path, value);
  }

  function getFieldValue(path: string) {
    return getFromPath(values, path);
  }

  function isFieldTouched(path: string) {
    return !!getFromPath(touched, path);
  }

  function isFieldSet(path: string) {
    return isPathSet(values, path);
  }

  const ctx: FormContext = {
    id: opts?.id ?? uniqId(),
    getValues: () => values,
    setFieldValue,
    setFieldTouched,
    getFieldValue,
    isFieldTouched,
    isFieldSet,
  };

  provide(FormKey, ctx);

  return {
    values,
    context: ctx,
    setFieldValue,
    getFieldValue,
    isFieldTouched,
  };
}
