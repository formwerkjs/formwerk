import { InjectionKey, provide, reactive } from 'vue';
import { getFromPath, setInPath } from '../utils/path';
import { uniqId } from '../utils/common';

export interface FormOptions {
  id: string;
}

export interface FormContext {
  id: string;
  values: Record<string, any>;
  getFieldValue: (path: string) => any;
  setFieldValue: (path: string, value: any) => void;
  setFieldTouched: (path: string, value: boolean) => void;
  isFieldTouched: (path: string) => boolean;
}

export const FormKey: InjectionKey<FormContext> = Symbol('Formwerk FormKey');

export function useForm(opts?: Partial<FormOptions>) {
  const values = reactive({});
  const touched = reactive({});

  function setFieldValue(path: string, value: any) {
    setInPath(values, path, value);
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

  const ctx: FormContext = {
    id: opts?.id ?? uniqId(),
    values,
    setFieldValue,
    setFieldTouched,
    getFieldValue,
    isFieldTouched,
  };

  provide(FormKey, ctx);

  return {
    context: ctx,
    setFieldValue,
    getFieldValue,
    isFieldTouched,
  };
}
