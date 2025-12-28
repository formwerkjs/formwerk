import type { JSONSchema as JSONSchemaDraft07 } from 'json-schema-typed/draft-07';
import { CombinedStandardSchema } from './types';

/**
 * Extracts default values from a JSON Schema Draft-07 structure.
 *
 * @param schema - A standard JSON Schema implementing Draft-07 object
 * @returns An object containing the extracted default values, or undefined if none found
 */
export function resolveJsonSchemaDefaults<TInput, TOutput>(
  schema: CombinedStandardSchema<TInput, TOutput>,
): TInput | undefined {
  try {
    if (!schema['~standard']?.jsonSchema?.input) {
      return undefined;
    }

    return extractDefaultsFromSchema(schema['~standard'].jsonSchema?.input({ target: 'draft-07' })) as TInput;
  } catch {
    return undefined;
  }
}

/**
 * Recursively extracts default values from a JSON Schema Draft-07 structure.
 */
function extractDefaultsFromSchema(schema: JSONSchemaDraft07): unknown {
  if (typeof schema === 'boolean') {
    return undefined;
  }

  if ('default' in schema && schema.default !== undefined) {
    return schema.default;
  }

  if (schema.allOf) {
    const merged: Record<string, unknown> = {};
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

  if (schema.anyOf || schema.oneOf) {
    const variants = schema.anyOf || schema.oneOf;
    for (const subSchema of variants!) {
      const subDefaults = extractDefaultsFromSchema(subSchema);
      if (subDefaults !== undefined) {
        return subDefaults;
      }
    }
  }

  if (schema.type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {};

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

  return undefined;
}
