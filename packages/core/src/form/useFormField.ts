import { computed, inject, MaybeRefOrGetter, readonly, ref, Ref, toValue } from 'vue';
import { FormContext, FormKey } from './useForm';
import { Getter } from '../types';
import { useSyncModel } from '../reactivity/useModelSync';

interface FormFieldOptions<TValue = unknown> {
  path: MaybeRefOrGetter<string | undefined> | undefined;
  initialValue: TValue;
  syncModel: boolean;
  modelName: string;
}

export function useFormField<TValue = unknown>(opts?: Partial<FormFieldOptions<TValue>>) {
  const form = inject(FormKey, null);
  const getPath = () => toValue(opts?.path);
  // TODO: Must set the initial value in  the form if it wasn't already set.
  const { fieldValue, setValue } = useFieldValue(getPath, form, opts?.initialValue);
  const { touched, setTouched } = form ? createFormTouchedRef(getPath, form) : createTouchedRef(false);

  if (opts?.syncModel ?? true) {
    useSyncModel({
      model: fieldValue,
      modelName: opts?.modelName ?? 'modelValue',
      onModelPropUpdated: setValue,
    });
  }

  // TODO: How to react to a field path change?
  // We need to update the form with the new path and value, this is easy, just call `setFieldValue` with the existing value.
  // But what about the previous path left behind? We need to remove it from the form. This is a bit tricky, because it could've been swapped with another field.
  // This means a path could be controlled by a field or taken over by another field. We need to handle this case.
  // This is what made vee-validate so complex, it had to handle all these cases. I need to figure a way to make this simpler. Something that just "works" without much thought.

  return {
    fieldValue: readonly(fieldValue) as Ref<TValue | undefined>,
    touched,
    setValue,
    setTouched,
  };
}

function useFieldValue<TValue = unknown>(
  getPath: Getter<string | undefined>,
  form?: FormContext | null,
  initialValue?: TValue,
) {
  const { fieldValue, setValue } = form
    ? createFormValueRef<TValue>(getPath, form, initialValue)
    : createValueRef<TValue>(initialValue);

  // TODO: Set initial value in form if present

  return {
    setValue,
    fieldValue,
  };
}

function createTouchedRef(initialTouched?: boolean) {
  const touched = ref(initialTouched ?? false);

  return {
    touched,
    setTouched(value: boolean) {
      touched.value = value;
    },
  };
}

function createFormTouchedRef(getPath: Getter<string | undefined>, form: FormContext) {
  const touched = computed(() => {
    const path = getPath();

    return path ? form.isFieldTouched(path) : false;
  }) as Ref<boolean>;

  function setTouched(value: boolean) {
    const path = getPath();
    if (path) {
      form.setFieldTouched(path, value);
    }
  }

  return {
    touched,
    setTouched,
  };
}

function createFormValueRef<TValue = unknown>(
  getPath: Getter<string | undefined>,
  form: FormContext,
  initialValue?: TValue | undefined,
) {
  const pathlessValue = ref(toValue(initialValue ?? undefined)) as Ref<TValue | undefined>;

  const fieldValue = computed(() => {
    const path = getPath();

    return path ? form.getFieldValue(path) : pathlessValue.value;
  }) as Ref<TValue | undefined>;

  function setValue(value: TValue | undefined) {
    const path = getPath();
    path ? form.setFieldValue(path, value) : (pathlessValue.value = value);
  }

  return {
    fieldValue,
    setValue,
  };
}

function createValueRef<TValue = unknown>(initialValue?: TValue) {
  const fieldValue = ref(toValue(initialValue ?? undefined)) as Ref<TValue | undefined>;

  return {
    fieldValue,
    setValue(value: TValue | undefined) {
      fieldValue.value = value;
    },
  };
}
