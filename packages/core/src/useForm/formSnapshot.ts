import { Ref, shallowRef, toValue } from 'vue';
import type { JSONSchema as JSONSchemaDraft07 } from 'json-schema-typed/draft-07';
import { StandardJSONSchemaV1 } from '@standard-schema/spec';
import { FormObject, MaybeGetter, MaybeAsync, StandardSchema } from '../types';
import { cloneDeep, isPromise } from '../utils/common';

interface FormSnapshotOptions<TForm extends FormObject, TOutput extends FormObject = TForm> {
  onAsyncInit?: (values: TForm) => void;
  schema?: StandardSchema<TForm, TOutput>;
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
  const schemaDefaults = opts?.schema?.['~standard'].jsonSchema
    ? resolveJsonSchemaValues<TForm, StandardJSONSchemaV1.Converter>(opts.schema['~standard'].jsonSchema)
    : undefined;

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

/**
 * Checks if a value is a plain object (not an array, null, or other special types).
 */
function isPlainObject(value: unknown): value is FormObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

/**
 * We only support draft-07 at the moment
 */
function resolveJsonSchemaValues<TForm extends FormObject, TConverter extends StandardJSONSchemaV1.Converter>(
  schema: TConverter,
): TForm | undefined {
  try {
    const input = schema.input({ target: 'draft-07' }) as JSONSchemaDraft07;

    return extractDefaultsFromSchema(input) as TForm | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Recursively extracts default values from a JSON Schema Draft-07 structure.
 */
function extractDefaultsFromSchema(schema: JSONSchemaDraft07): unknown {
  // Handle boolean schemas
  if (typeof schema === 'boolean') {
    return undefined;
  }

  // If the schema has a direct default, use it
  if ('default' in schema && schema.default !== undefined) {
    return cloneDeep(schema.default);
  }

  // Handle allOf by merging defaults from all schemas
  if (schema.allOf) {
    const merged: FormObject = {};
    for (const subSchema of schema.allOf) {
      const subDefaults = extractDefaultsFromSchema(subSchema);
      if (subDefaults && typeof subDefaults === 'object' && !Array.isArray(subDefaults)) {
        Object.assign(merged, subDefaults);
      }
    }
    if (Object.keys(merged).length > 0) {
      return merged;
    }
  }

  // Handle anyOf/oneOf by taking defaults from the first schema that has any
  if (schema.anyOf || schema.oneOf) {
    const variants = schema.anyOf || schema.oneOf;
    for (const subSchema of variants!) {
      const subDefaults = extractDefaultsFromSchema(subSchema);
      if (subDefaults !== undefined) {
        return subDefaults;
      }
    }
  }

  // Handle object type with properties
  if (schema.type === 'object' || schema.properties) {
    const result: FormObject = {};

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propDefault = extractDefaultsFromSchema(propSchema);
        if (propDefault !== undefined) {
          result[key] = propDefault;
        }
      }
    }

    if (Object.keys(result).length > 0) {
      return result;
    }
  }

  // Handle array type with items
  if (schema.type === 'array' && schema.items) {
    // If items is a single schema and has a default, we can't really generate array defaults
    // without knowing the intended length, so return undefined
    // Arrays typically need explicit defaults at the schema level
    return undefined;
  }

  return undefined;
}
