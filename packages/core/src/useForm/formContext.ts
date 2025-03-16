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
  DirtySchema,
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
  getValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  setValue<TPath extends Path<TForm>>(path: TPath, value: PathValue<TForm, TPath> | undefined): void;
  destroyPath<TPath extends Path<TForm>>(path: TPath): void;
  unsetPath<TPath extends Path<TForm>>(path: TPath): void;
  setTouched(value: boolean): void;
  setTouched<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  isTouched<TPath extends Path<TForm>>(path?: TPath): boolean;
  isDirty<TPath extends Path<TForm>>(path?: TPath): boolean;
  setDirty(value: boolean): void;
  setDirty<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  isFieldSet<TPath extends Path<TForm>>(path: TPath): boolean;
  getFieldInitialValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  getFieldOriginalValue<TPath extends Path<TForm>>(path: TPath): PathValue<TForm, TPath>;
  unsetInitialValue<TPath extends Path<TForm>>(path: TPath): void;
  setInitialValues: (newValues: Partial<TForm>, opts?: SetValueOptions) => void;
  setInitialTouched: (newTouched: Partial<TouchedSchema<TForm>>, opts?: SetValueOptions) => void;
  setFieldDisabled<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  getErrors<TPath extends Path<TForm>>(path?: TPath): string[];
  getIssues<TPath extends Path<TForm>>(path?: TPath): IssueCollection[];
  getFieldSubmitErrors<TPath extends Path<TForm>>(path: TPath): string[];
  setErrors<TPath extends Path<TForm>>(path: TPath, message: Arrayable<string>): void;
  setErrors<TPath extends Path<TForm>>(issues: IssueCollection<TPath>[]): void;
  setFieldSubmitErrors<TPath extends Path<TForm>>(path: TPath, message: Arrayable<string>): void;
  getValidationMode(): FormValidationMode;
  getSubmitErrors: () => IssueCollection[];
  clearErrors<TPath extends Path<TForm>>(path?: TPath): void;
  clearSubmitErrors: (path?: string) => void;
  getValues: () => TForm;
  setValues: (newValues: Partial<TForm>, opts?: SetValueOptions) => void;
  revertValues<TPath extends Path<TForm>>(path?: TPath): void;
  revertTouched<TPath extends Path<TForm>>(path?: TPath): void;
  revertDirty<TPath extends Path<TForm>>(path?: TPath): void;
  isPathDisabled: (path: Path<TForm>) => boolean;
}

export interface SetValueOptions {
  behavior: 'merge' | 'replace';
}

export interface FormContextCreateOptions<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm> {
  id: string;
  values: TForm;
  touched: TouchedSchema<TForm>;
  dirty: DirtySchema<TForm>;
  disabled: DisabledSchema<TForm>;
  errors: Ref<ErrorsSchema<TForm>>;
  submitErrors: Ref<ErrorsSchema<TForm>>;
  schema: StandardSchema<TForm, TOutput> | undefined;
  snapshots: {
    values: FormSnapshot<TForm>;
    touched: FormSnapshot<TouchedSchema<TForm>>;
    dirty: FormSnapshot<DirtySchema<TForm>>;
  };
}

export function createFormContext<TForm extends FormObject = FormObject, TOutput extends FormObject = TForm>({
  id,
  values,
  disabled,
  errors,
  dirty,
  submitErrors,
  schema,
  touched,
  snapshots,
}: FormContextCreateOptions<TForm, TOutput>): BaseFormContext<TForm> {
  function setValue<TPath extends Path<TForm>>(path: TPath, value: PathValue<TForm, TPath> | undefined) {
    setInPath(values, path, cloneDeep(value));
    const oldValue = getFieldOriginalValue(path);
    setDirty(path, !isEqual(oldValue, value));
  }

  function setTouched(value: boolean): void;
  function setTouched<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  function setTouched<TPath extends Path<TForm>>(pathOrValue: TPath | boolean, valueOrUndefined?: boolean): void {
    // If the pathOrValue is a boolean, we want to set all touched fields to that value
    if (typeof pathOrValue === 'boolean') {
      for (const key in touched) {
        setInPath(touched, key, pathOrValue, true);
      }

      return;
    }

    setInPath(touched, pathOrValue, valueOrUndefined, true);
  }

  function getValue<TPath extends Path<TForm>>(path: TPath) {
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
      return !!findLeaf(dirty, l => l === true);
    }

    const value = getFromPath(dirty, path);
    if (isObject(value)) {
      return !!findLeaf(value, v => !!v);
    }

    return !!value;
  }

  function setDirty(value: boolean): void;
  function setDirty<TPath extends Path<TForm>>(path: TPath, value: boolean): void;
  function setDirty<TPath extends Path<TForm>>(pathOrValue: TPath | boolean, valueOrUndefined?: boolean) {
    if (typeof pathOrValue === 'boolean') {
      for (const key in dirty) {
        setInPath(dirty, key, pathOrValue, true);
      }

      return;
    }

    setInPath(dirty, pathOrValue, valueOrUndefined, true);
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

  function isPathDisabled(path: Path<TForm>) {
    const value = getLastReachableValue(disabled, path);

    return typeof value === 'boolean' ? value : false;
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
      setValue(escapePath(key) as Path<TForm>, newValues[key] as PathValue<TForm, Path<TForm>>);
    });
  }

  function getErrors<TPath extends Path<TForm>>(path?: TPath) {
    return getIssues(path)
      .map(e => e.messages)
      .flat();
  }

  function getFieldSubmitErrors<TPath extends Path<TForm>>(path: TPath) {
    return [...(getFromPath<string[]>(submitErrors.value, escapePath(path), []) || [])];
  }

  function setErrors<TPath extends Path<TForm>>(path: TPath, message: Arrayable<string>): void;
  function setErrors<TPath extends Path<TForm>>(issues: IssueCollection<TPath>[]): void;
  function setErrors<TPath extends Path<TForm>>(
    pathOrIssues: TPath | IssueCollection<TPath>[],
    messageOrUndefined?: Arrayable<string>,
  ) {
    if (Array.isArray(pathOrIssues)) {
      pathOrIssues.forEach(issue => {
        setInPath(errors.value, issue.path, issue.messages);
      });

      return;
    }

    setInPath(errors.value, escapePath(pathOrIssues), messageOrUndefined ? normalizeArrayable(messageOrUndefined) : []);
  }

  function setFieldSubmitErrors<TPath extends Path<TForm>>(path: TPath, message: Arrayable<string>) {
    setInPath(submitErrors.value, escapePath(path), message ? normalizeArrayable(message) : []);
  }

  function updateTouched(newTouched: Partial<TouchedSchema<TForm>>, opts?: SetValueOptions) {
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

  function updateDirty(newDirty: Partial<DirtySchema<TForm>>, opts?: SetValueOptions) {
    if (opts?.behavior === 'merge') {
      merge(dirty, newDirty);

      return;
    }

    // Delete all keys, then set new values
    Object.keys(dirty).forEach(key => {
      delete dirty[key as keyof typeof dirty];
    });

    merge(dirty, newDirty);
  }

  function clearErrors(path?: string) {
    if (!path) {
      errors.value = {} as ErrorsSchema<TForm>;
      return;
    }

    Object.keys(errors.value).forEach(key => {
      if (key === path || key.startsWith(path + '.')) {
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
      if (key === path || key.startsWith(path + '.')) {
        delete submitErrors.value[key as Path<TForm>];
      }
    });
  }

  function revertValues<TPath extends Path<TForm>>(path?: TPath) {
    if (!path) {
      setValues(cloneDeep(snapshots.values.originals.value), { behavior: 'replace' });
      return;
    }

    const originalValue = getFieldOriginalValue(path);
    setValue(path, originalValue);
  }

  function revertTouched<TPath extends Path<TForm>>(path?: TPath) {
    if (!path) {
      updateTouched(cloneDeep(snapshots.touched.originals.value), { behavior: 'replace' });
      return;
    }
  }

  function revertDirty<TPath extends Path<TForm>>(path?: TPath) {
    if (!path) {
      updateDirty(cloneDeep(snapshots.dirty.originals.value), { behavior: 'replace' });
      return;
    }
  }

  function getValidationMode(): FormValidationMode {
    return schema ? 'schema' : 'aggregate';
  }

  function getIssues<TPath extends Path<TForm>>(path?: TPath): IssueCollection[] {
    const allErrors = Object.entries(errors.value)
      .map<IssueCollection>(([key, value]) => ({ path: key, messages: value as string[] }))
      .filter(e => e.messages.length > 0);

    if (!path) {
      return allErrors;
    }

    // Check if there are any errors in the path or its nested properties
    const pathPrefixErrors = allErrors.filter(e => {
      // Exact match
      if (e.path === path) {
        return true;
      }

      // Check for nested paths with dot notation (e.g., path.value)
      // This ensures we only match paths that are actually nested, not just string prefixes
      return e.path.startsWith(path + '.');
    });

    if (pathPrefixErrors.length > 0) {
      return pathPrefixErrors;
    }

    return [];
  }

  return {
    id,
    getValues: () => cloneDeep(values),
    setValue,
    getFieldInitialValue,
    setTouched,
    getValue,
    isTouched,
    isDirty,
    setDirty,
    isFieldSet,
    destroyPath,
    unsetPath,
    unsetInitialValue,
    setValues,
    revertValues,
    revertTouched,
    setInitialValues,
    revertDirty,
    setInitialTouched,
    getFieldOriginalValue,
    setFieldDisabled,
    setErrors,
    setFieldSubmitErrors,
    getErrors,
    getFieldSubmitErrors,
    getSubmitErrors,
    clearErrors,
    clearSubmitErrors,
    getValidationMode,
    isPathDisabled,
    getIssues,
  };
}
