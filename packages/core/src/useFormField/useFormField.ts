import { computed, inject, MaybeRefOrGetter, nextTick, readonly, Ref, shallowRef, toValue, watch } from 'vue';
import { FormContext, FormKey } from '../useForm/useForm';
import { Arrayable, Getter, StandardSchema, ValidationResult } from '../types';
import { useSyncModel } from '../reactivity/useModelSync';
import {
  cloneDeep,
  isEqual,
  normalizeArrayable,
  combineStandardIssues,
  tryOnScopeDispose,
  warn,
  isLowPriority,
} from '../utils/common';
import { FormGroupKey } from '../useFormGroup';
import { usePathPrefixer } from '../helpers/usePathPrefixer';
import { createDisabledContext } from '../helpers/createDisabledContext';

interface FormFieldOptions<TValue = unknown> {
  path: MaybeRefOrGetter<string | undefined> | undefined;
  initialValue: TValue;
  initialTouched: boolean;
  initialDirty: boolean;
  syncModel: boolean;
  modelName: string;
  disabled: MaybeRefOrGetter<boolean | undefined>;
  schema: StandardSchema<TValue>;
}

export type FormField<TValue> = {
  fieldValue: Ref<TValue | undefined>;
  isTouched: Ref<boolean>;
  isDirty: Ref<boolean>;
  isValid: Ref<boolean>;
  isDisabled: Ref<boolean>;
  errors: Ref<string[]>;
  errorMessage: Ref<string>;
  submitErrors: Ref<string[]>;
  submitErrorMessage: Ref<string | undefined>;
  schema: StandardSchema<TValue> | undefined;
  validate(mutate?: boolean): Promise<ValidationResult>;
  getPath: Getter<string | undefined>;
  getName: Getter<string | undefined>;
  setValue: (value: TValue | undefined) => void;
  setTouched: (touched: boolean) => void;
  setErrors: (messages: Arrayable<string>) => void;
  registerControl: (ctx: FormControlContext) => void;
  form?: FormContext | null;
};

export function useFormField<TValue = unknown>(opts?: Partial<FormFieldOptions<TValue>>): FormField<TValue> {
  const form = inject(FormKey, null);
  const formGroup = inject(FormGroupKey, null);
  const pathPrefixer = usePathPrefixer();
  const isDisabled = createDisabledContext(opts?.disabled);
  const getPath = () => {
    const path = toValue(opts?.path);

    return pathPrefixer ? pathPrefixer.prefixPath(path) : path;
  };
  const initialValue = opts?.initialValue;
  const { fieldValue, pathlessValue, setValue } = useFieldValue(getPath, form, initialValue);
  const { isTouched, pathlessTouched, setTouched } = useFieldTouched(getPath, form);
  const { errors, setErrors, isValid, errorMessage, pathlessValidity, submitErrors, submitErrorMessage } =
    useFieldValidity(getPath, isDisabled, form);

  const isDirty = computed(() => {
    if (!form) {
      return !isEqual(fieldValue.value, initialValue);
    }

    const path = getPath();
    if (!path) {
      return !isEqual(pathlessValue.value, initialValue);
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

  function createValidationResult(result: Omit<ValidationResult, 'type' | 'path'>): ValidationResult {
    return {
      type: 'FIELD',
      path: (formGroup ? toValue(opts?.path) : getPath()) || '',
      ...result,
    };
  }

  async function validate(mutate?: boolean): Promise<ValidationResult> {
    const schema = opts?.schema;
    if (!schema) {
      return Promise.resolve(
        createValidationResult({ isValid: true, errors: [], output: cloneDeep(fieldValue.value) }),
      );
    }

    if (__DEV__) {
      if (isDisabled.value) {
        warn('Field is disabled, the validation call will not have an immediate effect.');
      }
    }

    const result = await schema['~standard']['validate'](fieldValue.value);
    const errors = combineStandardIssues(result.issues || []);
    const output = 'value' in result ? result.value : undefined;

    if (mutate) {
      setErrors(errors.map(e => e.messages).flat());
    }

    return createValidationResult({
      isValid: errors.length === 0,
      output,
      errors,
    });
  }

  const field: FormField<TValue> = {
    fieldValue: readonly(fieldValue) as Ref<TValue | undefined>,
    isTouched: readonly(isTouched) as Ref<boolean>,
    isDirty,
    isValid,
    errors,
    errorMessage,
    isDisabled,
    schema: opts?.schema,
    validate,
    getPath,
    getName: () => toValue(opts?.path),
    setValue,
    setTouched,
    setErrors,
    registerControl,
    submitErrors,
    submitErrorMessage,
  };

  if (!form) {
    return field;
  }

  initFormPathIfNecessary({
    form,
    getPath,
    initialValue,
    initialTouched: opts?.initialTouched ?? false,
    initialDirty: opts?.initialDirty ?? false,
    isDisabled,
  });

  form.onSubmitAttempt(() => {
    setTouched(true);
  });

  tryOnScopeDispose(() => {
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
          value: cloneDeep(oldPath ? tf.getValue(oldPath) : pathlessValue.value),
          touched: oldPath ? tf.isTouched(oldPath) : pathlessTouched.value,
          dirty: oldPath ? tf.isDirty(oldPath) : isDirty.value,
          disabled: isDisabled.value,
          errors: [...(oldPath ? tf.getErrors(oldPath) : pathlessValidity.errors.value)],
        };
      });
    }
  });

  watch(isDisabled, disabled => {
    const path = getPath();
    if (!path) {
      return;
    }

    form.setFieldDisabled(path, disabled);
  });

  return { ...field, form };
}

function useFieldValidity(getPath: Getter<string | undefined>, isDisabled: Ref<boolean>, form?: FormContext | null) {
  const validity = form ? createFormValidityRef(getPath, form) : createLocalValidity();
  const errorMessage = computed(() => (isDisabled.value ? '' : (validity.errors.value[0] ?? '')));
  const submitErrorMessage = computed(() => (isDisabled.value ? '' : (validity.submitErrors.value[0] ?? '')));
  const isValid = computed(() => (isDisabled.value ? true : validity.errors.value.length === 0));

  return {
    ...validity,
    errors: computed(() => (isDisabled.value ? [] : validity.errors.value)),
    isValid,
    errorMessage,
    submitErrorMessage,
  };
}

function useFieldValue<TValue = unknown>(
  getPath: Getter<string | undefined>,
  form?: FormContext | null,
  initialValue?: TValue,
) {
  return form ? createFormValueRef<TValue>(getPath, form, initialValue) : createLocalValueRef<TValue>(initialValue);
}

function useFieldTouched(getPath: Getter<string | undefined>, form?: FormContext | null) {
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

function createFormTouchedRef(getPath: Getter<string | undefined>, form: FormContext) {
  const pathlessTouched = shallowRef(false);
  const isTouched = computed(() => {
    const path = getPath();

    return path ? form.isTouched(path) : pathlessTouched.value;
  }) as Ref<boolean>;

  function setTouched(value: boolean) {
    const path = getPath();
    const isDifferent = pathlessTouched.value !== value;
    pathlessTouched.value = value;
    // Only update it if the value is actually different, this avoids unnecessary path traversal/creation
    if (path && isDifferent) {
      form.setTouched(path, value);
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
  form: FormContext,
  initialValue?: TValue | undefined,
) {
  const pathlessValue = shallowRef(toValue(initialValue ?? undefined)) as Ref<TValue | undefined>;

  const fieldValue = computed(() => {
    const path = getPath();

    return path ? form.getValue(path) : pathlessValue.value;
  }) as Ref<TValue | undefined>;

  function setValue(value: TValue | undefined) {
    const path = getPath();
    pathlessValue.value = value;
    if (path) {
      form.setValue(path, value);
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

interface FormPathInitOptions {
  form: FormContext;
  getPath: Getter<string | undefined>;
  initialValue: unknown;
  initialTouched: boolean;
  initialDirty: boolean;
  isDisabled: MaybeRefOrGetter<boolean>;
}

/**
 * Sets the initial value of the form if not already set and if an initial value is provided.
 */
function initFormPathIfNecessary({
  form,
  getPath,
  initialValue,
  initialTouched,
  initialDirty,
  isDisabled,
}: FormPathInitOptions) {
  const path = getPath();
  if (!path) {
    return;
  }

  // If form does have a path set and the value is different from the initial value, set it.
  nextTick(() => {
    const formInitialValue = form.getFieldInitialValue(path);
    const currentValue = form.getValue(path);
    const assignedValue = isLowPriority(initialValue)
      ? (currentValue ?? formInitialValue ?? initialValue.value)
      : (initialValue ?? currentValue ?? formInitialValue);

    form.transaction((tf, { INIT_PATH }) => ({
      kind: INIT_PATH,
      path,
      value: assignedValue,
      touched: initialTouched,
      dirty: initialDirty,
      disabled: toValue(isDisabled),
      errors: [...tf.getErrors(path)],
    }));
  });
}

function createFormValidityRef(getPath: Getter<string | undefined>, form: FormContext) {
  const pathlessValidity = createLocalValidity();
  const errors = computed(() => {
    const path = getPath();

    return path ? form.getErrors(path) : pathlessValidity.errors.value;
  }) as Ref<string[]>;

  const submitErrors = computed(() => {
    const path = getPath();

    return path ? form.getFieldSubmitErrors(path) : [];
  });

  function setErrors(messages: Arrayable<string>) {
    pathlessValidity.setErrors(messages);
    const path = getPath();
    if (path) {
      form.setErrors(path, messages);
    }
  }

  return {
    pathlessValidity,
    errors,
    setErrors,
    submitErrors,
  };
}

function createLocalValidity() {
  const errors = shallowRef<string[]>([]);
  const submitErrors = shallowRef<string[]>([]);

  const api = {
    errors,
    submitErrors,
    setErrors(messages: Arrayable<string>) {
      errors.value = messages ? normalizeArrayable(messages) : [];
    },
  };

  return {
    pathlessValidity: api,
    ...api,
  };
}

export type ExposedField<TValue> = {
  /**
   * The error message for the field.
   */
  errorMessage: Ref<string | undefined>;

  /**
   * The errors for the field.
   */
  errors: Ref<string[]>;
  /**
   * The errors for the field from the last submit attempt.
   */
  submitErrors: Ref<string[]>;
  /**
   * The error message for the field from the last submit attempt.
   */
  submitErrorMessage: Ref<string | undefined>;
  /**
   * The value of the field.
   */
  fieldValue: Ref<TValue>;

  /**
   * Whether the field is dirty.
   */
  isDirty: Ref<boolean>;

  /**
   * Whether the field is touched.
   */
  isTouched: Ref<boolean>;

  /**
   * Whether the field is valid.
   */
  isValid: Ref<boolean>;

  /**
   * Whether the field is disabled.
   */
  isDisabled: Ref<boolean>;

  /**
   * Sets the errors for the field.
   */
  setErrors: (messages: Arrayable<string>) => void;

  /**
   * Sets the touched state for the field.
   */
  setTouched: (touched: boolean) => void;

  /**
   * Sets the value for the field.
   */
  setValue: (value: TValue) => void;

  /**
   * Validates the field.
   * @param mutate - Whether to set errors on the field as a result of the validation call, defaults to `true`.
   */
  validate: (mutate?: boolean) => Promise<ValidationResult>;
};

export function exposeField<TReturns extends object, TValue>(
  obj: TReturns,
  field: FormField<TValue>,
): ExposedField<TValue> & TReturns {
  const exposedField = {
    errorMessage: field.errorMessage,
    errors: field.errors,
    submitErrors: field.submitErrors,
    submitErrorMessage: field.submitErrorMessage,
    fieldValue: field.fieldValue as Ref<TValue>,
    isDirty: field.isDirty,
    isTouched: field.isTouched,
    isValid: field.isValid,
    isDisabled: field.isDisabled,
    setErrors: __DEV__
      ? (messages: Arrayable<string>) => {
          if (field.isDisabled.value) {
            warn('This field is disabled, setting errors will not take effect until the field is enabled.');
          }

          field.setErrors(messages);
        }
      : field.setErrors,
    setTouched: field.setTouched,
    setValue: field.setValue,
    validate: (mutate = true) => field.validate(mutate),
  } satisfies ExposedField<TValue>;

  return {
    ...obj,
    ...exposedField,
  } satisfies ExposedField<TValue> & TReturns;
}
