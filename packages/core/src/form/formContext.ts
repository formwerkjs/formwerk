import { Ref } from 'vue';
import { FormObject, Path, PathValue } from '../types';
import { cloneDeep } from '../utils/common';
import { getFromPath, isPathSet, setInPath, unsetPath as unsetInObject } from '../utils/path';

export interface FormContext<TForm extends FormObject = FormObject> {
  id: string;
  getFieldValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  setFieldValue<TPath extends Path<TForm>>(path: TPath, value: PathValue<TForm, TPath> | undefined): void;
  destroyPath<TPath extends Path<TForm>>(path: TPath): void;
  unsetPath<TPath extends Path<TForm>>(path: TPath): void;
  setFieldTouched<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  isFieldTouched<TPath extends Path<TForm>>(path: TPath): boolean;
  isFieldSet<TPath extends Path<TForm>>(path: TPath): boolean;
  getFieldInitialValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  unsetInitialValue<TPath extends Path<TForm>>(path: TPath): void;
  getValues: () => TForm;
}

export interface FormContextCreateOptions<TForm extends FormObject = FormObject> {
  id: string;
  values: TForm;
  initials: Ref<TForm>;
  originals: Ref<TForm>;
  touched: Record<string, boolean>;
}

export function createFormContext<TForm extends FormObject = FormObject>({
  id,
  values,
  initials,
  touched,
}: FormContextCreateOptions<TForm>): FormContext<TForm> {
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

  function destroyPath<TPath extends Path<TForm>>(path: TPath) {
    unsetInObject(values, path, true);
  }

  function unsetPath<TPath extends Path<TForm>>(path: TPath) {
    unsetInObject(values, path, false);
  }

  function getFieldInitialValue<TPath extends Path<TForm>>(path: TPath) {
    return getFromPath(initials.value, path) as PathValue<TForm, TPath>;
  }

  function unsetInitialValue<TPath extends Path<TForm>>(path: TPath) {
    unsetInObject(initials.value, path);
  }

  return {
    id,
    getValues: () => cloneDeep(values),
    setFieldValue,
    getFieldInitialValue,
    setFieldTouched,
    getFieldValue,
    isFieldTouched,
    isFieldSet,
    destroyPath,
    unsetPath,
    unsetInitialValue,
  };
}
