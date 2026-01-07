import { Ref, shallowRef, toValue } from 'vue';
import { resolveJsonSchemaDefaults, type CombinedStandardSchema } from '@formwerk/schema';
import { FormObject, MaybeGetter, MaybeAsync } from '../types';
import { cloneDeep, isPromise } from '../utils/common';
import { isPlainObject } from '../../../shared/src';

interface FormSnapshotOptions<TForm extends FormObject, TOutput extends FormObject = TForm> {
  onAsyncInit?: (values: TForm) => void;
  schema?: CombinedStandardSchema<TForm, TOutput>;
}

export interface FormSnapshot<TForm extends FormObject> {
  initials: Ref<TForm>;
  originals: Ref<TForm>;
}

export function useFormSnapshots<TForm extends FormObject, TOutput extends FormObject = TForm>(
  provider: MaybeGetter<MaybeAsync<TForm>> | undefined,
  opts?: FormSnapshotOptions<TForm, TOutput>,
): FormSnapshot<TForm> {
  // We need two copies of the initial values
  const initials = shallowRef<TForm>({} as TForm) as Ref<TForm>;
  const originals = shallowRef<TForm>({} as TForm) as Ref<TForm>;

  // Extract schema defaults if JSON schema is available
  let schemaDefaults: TForm | undefined;
  if (opts?.schema) {
    schemaDefaults = resolveJsonSchemaDefaults(opts?.schema);
  }

  const provided = toValue(provider);
  if (isPromise(provided)) {
    provided.then(resolved => {
      const inits = mergeWithDefaults(schemaDefaults, resolved);
      initials.value = cloneDeep(inits) as TForm;
      originals.value = cloneDeep(inits) as TForm;
      opts?.onAsyncInit?.(cloneDeep(inits) as TForm);
    });
  } else {
    const inits = mergeWithDefaults(schemaDefaults, provided);
    initials.value = cloneDeep(inits) as TForm;
    originals.value = cloneDeep(inits) as TForm;
  }

  return {
    initials,
    originals,
  };
}

/**
 * Deep merges schema defaults with provided values.
 * Provided values take precedence over defaults.
 */
function mergeWithDefaults<TForm extends FormObject>(defaults: TForm | undefined, provided: TForm | undefined): TForm {
  if (!defaults) {
    return (provided || {}) as TForm;
  }

  if (!provided) {
    return defaults;
  }

  const result = { ...defaults } as TForm;

  for (const key of Object.keys(provided) as Array<keyof TForm>) {
    const providedValue = provided[key];
    const defaultValue = result[key];

    // If provided value is undefined, keep the default
    if (providedValue === undefined) {
      continue;
    }

    // If both are plain objects, merge recursively
    if (isPlainObject(providedValue) && isPlainObject(defaultValue)) {
      result[key] = mergeWithDefaults(defaultValue as FormObject, providedValue as FormObject) as TForm[keyof TForm];
    } else {
      // Otherwise, provided value takes precedence
      result[key] = providedValue;
    }
  }

  return result;
}
