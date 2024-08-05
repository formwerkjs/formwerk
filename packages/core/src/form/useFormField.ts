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
import { Arrayable, Getter } from '../types';
import { useSyncModel } from '../reactivity/useModelSync';
import { cloneDeep, isEqual, normalizeArrayable } from '../utils/common';

interface FormFieldOptions<TValue = unknown> {
  path: MaybeRefOrGetter<string | undefined> | undefined;
  initialValue: TValue;
  initialTouched: boolean;
  syncModel: boolean;
  modelName: string;
  disabled: MaybeRefOrGetter<boolean | undefined>;
}

export type FormField<TValue> = {
  fieldValue: Ref<TValue | undefined>;
  isTouched: Ref<boolean>;
  isDirty: Ref<boolean>;
  isValid: Ref<boolean>;
  errors: Ref<string[]>;
  errorMessage: Ref<string>;
  setValue: (value: TValue | undefined) => void;
  setTouched: (touched: boolean) => void;
  setErrors: (messages: Arrayable<string>) => void;
};

export function useFormField<TValue = unknown>(opts?: Partial<FormFieldOptions<TValue>>): FormField<TValue> {
  const form = inject(FormKey, null);
  const getPath = () => toValue(opts?.path);
  const { fieldValue, pathlessValue, setValue } = useFieldValue(getPath, form, opts?.initialValue);
  const { isTouched, pathlessTouched, setTouched } = useFieldTouched(getPath, form);
  const { errors, setErrors, isValid, errorMessage, pathlessValidity } = useFieldValidity(getPath, form);

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

  const field: FormField<TValue> = {
    fieldValue: readonly(fieldValue) as Ref<TValue | undefined>,
    isTouched: readonly(isTouched) as Ref<boolean>,
    isDirty,
    isValid,
    errors,
    errorMessage,
    setValue,
    setTouched,
    setErrors,
  };

  if (!form) {
    return field;
  }

  initFormPathIfNecessary(
    form,
    getPath,
    opts?.initialValue,
    opts?.initialTouched ?? false,
    toValue(opts?.disabled) ?? false,
  );

  form.onSubmitAttempt(() => {
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
          disabled: toValue(opts?.disabled) ?? false,
          errors: [...(oldPath ? tf.getFieldErrors(oldPath) : pathlessValidity.errors.value)],
        };
      });
    }
  });

  if (opts?.disabled) {
    watch(
      () => toValue(opts?.disabled) ?? false,
      disabled => {
        const path = getPath();
        if (!path) {
          return;
        }

        form.setFieldDisabled(path, disabled);
      },
    );
  }

  return field;
}

function useFieldValidity(getPath: Getter<string | undefined>, form?: FormContextWithTransactions | null) {
  const validity = form ? createFormValidityRef(getPath, form) : createLocalValidity();
  const errorMessage = computed(() => validity.errors.value[0] ?? '');
  const isValid = computed(() => validity.errors.value.length === 0);

  return {
    ...validity,
    isValid,
    errorMessage,
  };
}

function useFieldValue<TValue = unknown>(
  getPath: Getter<string | undefined>,
  form?: FormContextWithTransactions | null,
  initialValue?: TValue,
) {
  return form ? createFormValueRef<TValue>(getPath, form, initialValue) : createLocalValueRef<TValue>(initialValue);
}

function useFieldTouched(getPath: Getter<string | undefined>, form?: FormContextWithTransactions | null) {
  return form ? createFormTouchedRef(getPath, form) : createLocalTouchedRef(false);
}

function createLocalTouchedRef(initialTouched?: boolean) {
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

    return path ? form.isFieldTouched(path) : pathlessTouched.value;
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

function createLocalValueRef<TValue = unknown>(initialValue?: TValue) {
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
  disabled: boolean,
) {
  const path = getPath();
  if (!path) {
    return;
  }

  // If form does have a path set and the value is different from the initial value, set it.
  nextTick(() => {
    form.transaction((tf, { INIT_PATH }) => ({
      kind: INIT_PATH,
      path,
      value: initialValue ?? form.getFieldInitialValue(path),
      touched: initialTouched,
      disabled,
      errors: [...tf.getFieldErrors(path)],
    }));
  });
}

function createFormValidityRef(getPath: Getter<string | undefined>, form: FormContextWithTransactions) {
  const pathlessValidity = createLocalValidity();
  const errors = computed(() => {
    const path = getPath();

    return path ? form.getFieldErrors(path) : pathlessValidity.errors.value;
  }) as Ref<string[]>;

  function setErrors(messages: Arrayable<string>) {
    pathlessValidity.setErrors(messages);
    const path = getPath();
    if (path) {
      form.setFieldErrors(path, messages);
    }
  }

  return {
    pathlessValidity,
    errors,
    setErrors,
  };
}

function createLocalValidity() {
  const errors = shallowRef<string[]>([]);

  const api = {
    errors,
    setErrors(messages: Arrayable<string>) {
      errors.value = messages ? normalizeArrayable(messages) : [];
    },
  };

  return {
    pathlessValidity: api,
    ...api,
  };
}
