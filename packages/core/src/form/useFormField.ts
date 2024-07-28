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
  const { touched, pathlessTouched, setTouched } = form ? createFormTouchedRef(getPath, form) : createTouchedRef(false);

  if (opts?.syncModel ?? true) {
    useSyncModel({
      model: fieldValue,
      modelName: opts?.modelName ?? 'modelValue',
      onModelPropUpdated: setValue,
    });
  }

  const field = {
    fieldValue: readonly(fieldValue) as Ref<TValue | undefined>,
    touched,
    setValue,
    setTouched,
  };

  if (!form) {
    return field;
  }

  // TODO: How to react to a field path change?
  // We need to update the form with the new path and value, this is easy, just call `setFieldValue` with the existing value.
  // But what about the previous path left behind? We need to remove it from the form. This is a bit tricky, because it could've been swapped with another field.
  // This means a path could be controlled by a field or taken over by another field. We need to handle this case.
  // This is what made vee-validate so complex, it had to handle all these cases. I need to figure a way to make this simpler. Something that just "works" without much thought.

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
  const touched = shallowRef(initialTouched ?? false);

  return {
    touched,
    pathlessTouched: touched,
    setTouched(value: boolean) {
      touched.value = value;
    },
  };
}

function createFormTouchedRef(getPath: Getter<string | undefined>, form: FormContextWithTransactions) {
  const pathlessTouched = shallowRef(false);
  const touched = computed(() => {
    const path = getPath();

    return path ? form.isFieldTouched(path) : false;
  }) as Ref<boolean>;

  function setTouched(value: boolean) {
    const path = getPath();
    pathlessTouched.value = value;
    if (path) {
      form.setFieldTouched(path, value);
    }
  }

  return {
    touched,
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
