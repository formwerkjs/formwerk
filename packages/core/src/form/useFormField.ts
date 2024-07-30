import {
  computed,
  inject,
  MaybeRefOrGetter,
  nextTick,
  onBeforeUnmount,
  readonly,
  Ref,
  shallowRef,
  toValue,
  watch,
} from 'vue';
import { FormContextWithTransactions, FormKey } from './useForm';
import { Getter } from '../types';
import { useSyncModel } from '../reactivity/useModelSync';
import { cloneDeep, isEqual } from '../utils/common';

interface FormFieldOptions<TValue = unknown> {
  path: MaybeRefOrGetter<string | undefined> | undefined;
  initialValue: TValue;
  initialTouched: boolean;
  syncModel: boolean;
  modelName: string;
}

export function useFormField<TValue = unknown>(opts?: Partial<FormFieldOptions<TValue>>) {
  const form = inject(FormKey, null);
  const getPath = () => toValue(opts?.path);
  const { fieldValue, pathlessValue, setValue } = useFieldValue(getPath, form, opts?.initialValue);
  const { isTouched, pathlessTouched, setTouched } = form
    ? createFormTouchedRef(getPath, form)
    : createTouchedRef(false);

  const isDirty = computed(() => {
    if (!form) {
      return !isEqual(fieldValue.value, opts?.initialValue);
    }

    const path = getPath();
    if (!path) {
      return !isEqual(pathlessValue.value, opts?.initialValue);
    }

    return !isEqual(fieldValue.value, form.getFieldOriginalValue(path));
  });

  if (opts?.syncModel ?? true) {
    useSyncModel({
      model: fieldValue,
      modelName: opts?.modelName ?? 'modelValue',
      onModelPropUpdated: setValue,
    });
  }

  const field = {
    fieldValue: readonly(fieldValue) as Ref<TValue | undefined>,
    isTouched: readonly(isTouched) as Ref<boolean>,
    isDirty,
    setValue,
    setTouched,
  };

  if (!form) {
    return field;
  }

  initFormPathIfNecessary(form, getPath, opts?.initialValue, opts?.initialTouched ?? false);

  form.onSubmitted(() => {
    setTouched(true);
  });

  onBeforeUnmount(() => {
    const path = getPath();
    if (!path) {
      return null;
    }

    form.transaction((_, { DESTROY_PATH }) => {
      return {
        kind: DESTROY_PATH,
        path: path,
      };
    });
  });

  watch(getPath, (newPath, oldPath) => {
    if (oldPath) {
      form.transaction((_, { UNSET_PATH }) => {
        return {
          kind: UNSET_PATH,
          path: oldPath,
        };
      });
    }

    if (newPath) {
      form.transaction((tf, { SET_PATH }) => {
        return {
          kind: SET_PATH,
          path: newPath,
          value: cloneDeep(oldPath ? tf.getFieldValue(oldPath) : pathlessValue.value),
          touched: oldPath ? tf.isFieldTouched(oldPath) : pathlessTouched.value,
        };
      });
    }
  });

  return field;
}

function useFieldValue<TValue = unknown>(
  getPath: Getter<string | undefined>,
  form?: FormContextWithTransactions | null,
  initialValue?: TValue,
) {
  return form ? createFormValueRef<TValue>(getPath, form, initialValue) : createValueRef<TValue>(initialValue);
}

function createTouchedRef(initialTouched?: boolean) {
  const isTouched = shallowRef(initialTouched ?? false);

  return {
    isTouched,
    pathlessTouched: isTouched,
    setTouched(value: boolean) {
      isTouched.value = value;
    },
  };
}

function createFormTouchedRef(getPath: Getter<string | undefined>, form: FormContextWithTransactions) {
  const pathlessTouched = shallowRef(false);
  const isTouched = computed(() => {
    const path = getPath();

    return path ? form.isFieldTouched(path) : false;
  }) as Ref<boolean>;

  function setTouched(value: boolean) {
    const path = getPath();
    const isDifferent = pathlessTouched.value !== value;
    pathlessTouched.value = value;
    // Only update it if the value is actually different, this avoids unnecessary path traversal/creation
    if (path && isDifferent) {
      form.setFieldTouched(path, value);
    }
  }

  return {
    isTouched,
    pathlessTouched,
    setTouched,
  };
}

function createFormValueRef<TValue = unknown>(
  getPath: Getter<string | undefined>,
  form: FormContextWithTransactions,
  initialValue?: TValue | undefined,
) {
  const pathlessValue = shallowRef(toValue(initialValue ?? undefined)) as Ref<TValue | undefined>;

  const fieldValue = computed(() => {
    const path = getPath();

    return path ? form.getFieldValue(path) : pathlessValue.value;
  }) as Ref<TValue | undefined>;

  function setValue(value: TValue | undefined) {
    const path = getPath();
    pathlessValue.value = value;
    if (path) {
      form.setFieldValue(path, value);
    }
  }

  return {
    fieldValue,
    pathlessValue,
    setValue,
  };
}

function createValueRef<TValue = unknown>(initialValue?: TValue) {
  const fieldValue = shallowRef(toValue(initialValue ?? undefined)) as Ref<TValue | undefined>;

  return {
    fieldValue,
    pathlessValue: fieldValue,
    setValue(value: TValue | undefined) {
      fieldValue.value = cloneDeep(value);
    },
  };
}

/**
 * Sets the initial value of the form if not already set and if an initial value is provided.
 */
function initFormPathIfNecessary(
  form: FormContextWithTransactions,
  getPath: Getter<string | undefined>,
  initialValue: unknown,
  initialTouched: boolean,
) {
  const path = getPath();
  if (!path) {
    return;
  }

  // If form does have a path set and the value is different from the initial value, set it.
  if (form.isFieldSet(path) && !isEqual(form.getFieldValue(path), initialValue)) {
    nextTick(() => {
      form.transaction((_, { INIT_PATH }) => ({
        kind: INIT_PATH,
        path,
        value: initialValue,
        touched: initialTouched,
      }));
    });
    return;
  }

  // If the path is not set, set it.
  if (!form.isFieldSet(path)) {
    nextTick(() => {
      form.transaction((_, { INIT_PATH }) => ({
        kind: INIT_PATH,
        path,
        value: initialValue,
        touched: initialTouched,
      }));
    });

    return;
  }
}
