import { FormObject, Path, PathValue, TouchedSchema } from '../types';
import { cloneDeep, merge } from '../utils/common';
import { escapePath, getFromPath, isPathSet, setInPath, unsetPath as unsetInObject } from '../utils/path';
import { FormSnapshot } from './formSnapshot';

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
  setInitialValues: (newValues: Partial<TForm>, opts?: SetValueOptions) => void;
  setInitialTouched: (newTouched: Partial<TouchedSchema<TForm>>, opts?: SetValueOptions) => void;
  getValues: () => TForm;
  setValues: (newValues: Partial<TForm>, opts?: SetValueOptions) => void;
  revertValues: () => void;
  revertTouched: () => void;
}

export interface SetValueOptions {
  mode: 'merge' | 'replace';
}

export interface FormContextCreateOptions<TForm extends FormObject = FormObject> {
  id: string;
  values: TForm;
  touched: TouchedSchema<TForm>;
  snapshots: {
    values: FormSnapshot<TForm>;
    touched: FormSnapshot<TouchedSchema<TForm>>;
  };
}

export function createFormContext<TForm extends FormObject = FormObject>({
  id,
  values,
  touched,
  snapshots,
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
    return getFromPath(snapshots.values.initials.value, path) as PathValue<TForm, TPath>;
  }

  function unsetInitialValue<TPath extends Path<TForm>>(path: TPath) {
    unsetInObject(snapshots.values.initials.value, path);
  }

  function setInitialValues(newValues: Partial<TForm>, opts?: SetValueOptions) {
    if (opts?.mode === 'merge') {
      snapshots.values.initials.value = merge(cloneDeep(snapshots.values.initials.value), cloneDeep(newValues));
      snapshots.values.originals.value = cloneDeep(snapshots.values.initials.value);

      return;
    }

    snapshots.values.initials.value = cloneDeep(newValues) as TForm;
    snapshots.values.originals.value = cloneDeep(newValues) as TForm;
  }

  function setInitialTouched(newTouched: Partial<TouchedSchema<TForm>>, opts?: SetValueOptions) {
    if (opts?.mode === 'merge') {
      snapshots.touched.initials.value = merge(cloneDeep(snapshots.touched.initials.value), cloneDeep(newTouched));
      snapshots.touched.originals.value = cloneDeep(snapshots.touched.initials.value);

      return;
    }

    snapshots.touched.initials.value = cloneDeep(newTouched) as TouchedSchema<TForm>;
    snapshots.touched.originals.value = cloneDeep(newTouched) as TouchedSchema<TForm>;
  }

  /**
   * Set values on the form.
   * TODO: Maybe have two different signatures for this method? A partial for merge mode and a full for replace mode?
   */
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
      setFieldValue(escapePath(key) as any, newValues[key]);
    });
  }

  function setTouched(newTouched: Partial<TouchedSchema<TForm>>, opts?: SetValueOptions) {
    if (opts?.mode === 'merge') {
      merge(touched, newTouched);

      return;
    }

    // Delete all keys, then set new values
    Object.keys(touched).forEach(key => {
      delete touched[key as keyof typeof touched];
    });

    merge(touched, newTouched);
  }

  function revertValues() {
    setValues(cloneDeep(snapshots.values.originals.value), { mode: 'replace' });
  }

  function revertTouched() {
    setTouched(cloneDeep(snapshots.touched.originals.value), { mode: 'replace' });
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
    setValues,
    revertValues,
    revertTouched,
    setInitialValues,
    setInitialTouched,
  };
}
