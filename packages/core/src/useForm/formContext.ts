import { Ref } from 'vue';
import {
  Arrayable,
  DisabledSchema,
  FormObject,
  Path,
  PathValue,
  TouchedSchema,
  StandardSchema,
  ErrorsSchema,
  IssueCollection,
} from '../types';
import { cloneDeep, isEqual, normalizeArrayable } from '../utils/common';
import {
  escapePath,
  findLeaf,
  getFromPath,
  getLastReachableValue,
  isPathSet,
  setInPath,
  unsetPath as unsetInObject,
} from '../utils/path';
import { FormSnapshot } from './formSnapshot';
import { isObject, merge } from '../../../shared/src';

export type FormValidationMode = 'aggregate' | 'schema';

export interface BaseFormContext<TForm extends FormObject = FormObject> {
  id: string;
  getFieldValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  setFieldValue<TPath extends Path<TForm>>(path: TPath, value: PathValue<TForm, TPath> | undefined): void;
  destroyPath<TPath extends Path<TForm>>(path: TPath): void;
  unsetPath<TPath extends Path<TForm>>(path: TPath): void;
  setFieldTouched<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  isTouched<TPath extends Path<TForm>>(path?: TPath): boolean;
  isDirty<TPath extends Path<TForm>>(path?: TPath): boolean;
  isFieldSet<TPath extends Path<TForm>>(path: TPath): boolean;
  getFieldInitialValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  getFieldOriginalValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  unsetInitialValue<TPath extends Path<TForm>>(path: TPath): void;
  setInitialValues: (newValues: Partial<TForm>, opts?: SetValueOptions) => void;
  setInitialTouched: (newTouched: Partial<TouchedSchema<TForm>>, opts?: SetValueOptions) => void;
  setFieldDisabled<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  getFieldErrors<TPath extends Path<TForm>>(path: TPath): string[];
  getFieldSubmitErrors<TPath extends Path<TForm>>(path: TPath): string[];
  setFieldErrors<TPath extends Path<TForm>>(path: TPath, message: Arrayable<string>): void;
  setFieldSubmitErrors<TPath extends Path<TForm>>(path: TPath, message: Arrayable<string>): void;
  getValidationMode(): FormValidationMode;
  getErrors: <TPath extends Path<TForm>>(path?: TPath) => IssueCollection[];
  getSubmitErrors: () => IssueCollection[];
  clearErrors: (path?: string) => void;
  clearSubmitErrors: (path?: string) => void;
  hasErrors: () => boolean;
  getValues: () => TForm;
  setValues: (newValues: Partial<TForm>, opts?: SetValueOptions) => void;
  revertValues: () => void;
  revertTouched: () => void;
  isPathDisabled: (path: Path<TForm>) => boolean;
}

export interface SetValueOptions {
  behavior: 'merge' | 'replace';
}

export interface FormContextCreateOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  id: string;
  values: TForm;
  touched: TouchedSchema<TForm>;
  disabled: DisabledSchema<TForm>;
  errors: Ref<ErrorsSchema<TForm>>;
  submitErrors: Ref<ErrorsSchema<TForm>>;
  schema: StandardSchema<TForm, TOutput> | undefined;
  snapshots: {
    values: FormSnapshot<TForm>;
    touched: FormSnapshot<TouchedSchema<TForm>>;
  };
}

export function createFormContext<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>({
  id,
  values,
  disabled,
  errors,
  submitErrors,
  schema,
  touched,
  snapshots,
}: FormContextCreateOptions<TForm, TOutput>): BaseFormContext<TForm> {
  function setFieldValue<TPath extends Path<TForm>>(path: TPath, value: PathValue<TForm, TPath> | undefined) {
    setInPath(values, path, cloneDeep(value));
  }

  function setFieldTouched<TPath extends Path<TForm>>(path: TPath, value: boolean) {
    setInPath(touched, path, value, true);
  }

  function getFieldValue<TPath extends Path<TForm>>(path: TPath) {
    return getFromPath(values, path) as PathValue<TForm, TPath>;
  }

  function isTouched<TPath extends Path<TForm>>(path?: TPath) {
    if (!path) {
      return !!findLeaf(touched, l => l === true);
    }

    const value = getFromPath(touched, path);
    if (isObject(value)) {
      return !!findLeaf(value, v => !!v);
    }

    return !!value;
  }

  function isDirty<TPath extends Path<TForm>>(path?: TPath) {
    if (!path) {
      return !isEqual(values, snapshots.values.originals.value);
    }

    return !isEqual(getFieldValue(path), getFieldOriginalValue(path));
  }

  function isFieldSet<TPath extends Path<TForm>>(path: TPath) {
    return isPathSet(values, path);
  }

  function destroyPath<TPath extends Path<TForm>>(path: TPath) {
    unsetInObject(values, path, true);
    unsetInObject(touched, path, true);
    unsetInObject(disabled, escapePath(path), true);
    unsetInObject(errors.value, escapePath(path), true);
  }

  function unsetPath<TPath extends Path<TForm>>(path: TPath) {
    unsetInObject(values, path, false);
    unsetInObject(touched, path, false);
    unsetInObject(disabled, escapePath(path), false);
    unsetInObject(errors.value, escapePath(path), false);
  }

  function getFieldInitialValue<TPath extends Path<TForm>>(path: TPath) {
    return getFromPath(snapshots.values.initials.value, path) as PathValue<TForm, TPath>;
  }

  function getFieldOriginalValue<TPath extends Path<TForm>>(path: TPath) {
    return getFromPath(snapshots.values.originals.value, path) as PathValue<TForm, TPath>;
  }

  function unsetInitialValue<TPath extends Path<TForm>>(path: TPath) {
    unsetInObject(snapshots.values.initials.value, path);
  }

  function setFieldDisabled<TPath extends Path<TForm>>(path: TPath, value: boolean) {
    setInPath(disabled, escapePath(path), value);
  }

  function hasErrors() {
    return !!findLeaf(
      errors.value,
      (l, path) => !isPathDisabled(path as Path<TForm>) && Array.isArray(l) && l.length > 0,
    );
  }

  function isPathDisabled(path: Path<TForm>) {
    const value = getLastReachableValue(disabled, path);

    return typeof value === 'boolean' ? value : false;
  }

  function getErrors<TPath extends Path<TForm>>(path?: TPath): IssueCollection[] {
    const allErrors = Object.entries(errors.value)
      .map<IssueCollection>(([key, value]) => ({ path: key, messages: value as string[] }))
      .filter(e => e.messages.length > 0);

    if (!path) {
      return allErrors;
    }

    return allErrors.filter(e => e.path.startsWith(path));
  }

  function getSubmitErrors(): IssueCollection[] {
    return Object.entries(submitErrors.value)
      .map<IssueCollection>(([key, value]) => ({ path: key, messages: value as string[] }))
      .filter(e => e.messages.length > 0);
  }

  function setInitialValues(newValues: Partial<TForm>, opts?: SetValueOptions) {
    if (opts?.behavior === 'merge') {
      snapshots.values.initials.value = merge(cloneDeep(snapshots.values.initials.value), cloneDeep(newValues));
      snapshots.values.originals.value = cloneDeep(snapshots.values.initials.value);

      return;
    }

    snapshots.values.initials.value = cloneDeep(newValues) as TForm;
    snapshots.values.originals.value = cloneDeep(newValues) as TForm;
  }

  function setInitialTouched(newTouched: Partial<TouchedSchema<TForm>>, opts?: SetValueOptions) {
    if (opts?.behavior === 'merge') {
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
    if (opts?.behavior === 'merge') {
      merge(values, newValues);

      return;
    }

    // Clear the Object
    Object.keys(values).forEach(key => {
      delete values[key as keyof typeof values];
    });

    // We escape paths automatically
    Object.keys(newValues).forEach(key => {
      setFieldValue(escapePath(key) as Path<TForm>, newValues[key] as PathValue<TForm, Path<TForm>>);
    });
  }

  function getFieldErrors<TPath extends Path<TForm>>(path: TPath) {
    // First check for direct errors at this path
    const directErrors = getFromPath<string[]>(errors.value, escapePath(path), []);

    if (directErrors?.length) {
      return [...directErrors];
    }

    // Check if there are any errors in the path prefix
    const allErrors = getErrors();
    const pathPrefixErrors = allErrors.filter(e => e.path.startsWith(path));

    if (pathPrefixErrors.length > 0) {
      return [pathPrefixErrors[0].messages[0]];
    }

    return [];
  }

  function getFieldSubmitErrors<TPath extends Path<TForm>>(path: TPath) {
    return [...(getFromPath<string[]>(submitErrors.value, escapePath(path), []) || [])];
  }

  function setFieldErrors<TPath extends Path<TForm>>(path: TPath, message: Arrayable<string>) {
    setInPath(errors.value, escapePath(path), message ? normalizeArrayable(message) : []);
  }

  function setFieldSubmitErrors<TPath extends Path<TForm>>(path: TPath, message: Arrayable<string>) {
    setInPath(submitErrors.value, escapePath(path), message ? normalizeArrayable(message) : []);
  }

  function setTouched(newTouched: Partial<TouchedSchema<TForm>>, opts?: SetValueOptions) {
    if (opts?.behavior === 'merge') {
      merge(touched, newTouched);

      return;
    }

    // Delete all keys, then set new values
    Object.keys(touched).forEach(key => {
      delete touched[key as keyof typeof touched];
    });

    merge(touched, newTouched);
  }

  function clearErrors(path?: string) {
    if (!path) {
      errors.value = {} as ErrorsSchema<TForm>;
      return;
    }

    Object.keys(errors.value).forEach(key => {
      if (key === path || key.startsWith(path)) {
        delete errors.value[key as Path<TForm>];
      }
    });
  }

  function clearSubmitErrors(path?: string) {
    if (!path) {
      submitErrors.value = {} as ErrorsSchema<TForm>;
      return;
    }

    Object.keys(submitErrors.value).forEach(key => {
      if (key === path || key.startsWith(path)) {
        delete submitErrors.value[key as Path<TForm>];
      }
    });
  }

  function revertValues() {
    setValues(cloneDeep(snapshots.values.originals.value), { behavior: 'replace' });
  }

  function revertTouched() {
    setTouched(cloneDeep(snapshots.touched.originals.value), { behavior: 'replace' });
  }

  function getValidationMode(): FormValidationMode {
    return schema ? 'schema' : 'aggregate';
  }

  return {
    id,
    getValues: () => cloneDeep(values),
    setFieldValue,
    getFieldInitialValue,
    setFieldTouched,
    getFieldValue,
    isTouched,
    isDirty,
    isFieldSet,
    destroyPath,
    unsetPath,
    unsetInitialValue,
    setValues,
    revertValues,
    revertTouched,
    setInitialValues,
    setInitialTouched,
    getFieldOriginalValue,
    setFieldDisabled,
    setFieldErrors,
    setFieldSubmitErrors,
    getFieldErrors,
    getFieldSubmitErrors,
    hasErrors,
    getErrors,
    getSubmitErrors,
    clearErrors,
    clearSubmitErrors,
    getValidationMode,
    isPathDisabled,
  };
}
