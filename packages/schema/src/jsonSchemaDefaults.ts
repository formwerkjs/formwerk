import type { JSONSchema as JSONSchemaDraft07 } from 'json-schema-typed/draft-07';
import { StandardJSONSchemaV1 } from '@standard-schema/spec';

export interface JsonSchemaDefaultsOptions {
  /**
   * Custom clone function to use for cloning default values.
   * If not provided, a basic structured clone will be used.
   */
  clone?: <T>(value: T) => T;
}

/**
 * Extracts default values from a Standard Schema's JSON Schema converter.
 * Currently only supports JSON Schema Draft-07.
 *
 * @param converter - The JSON Schema converter from a Standard Schema's `~standard.jsonSchema` property
 * @param options - Optional configuration
 * @returns An object containing the extracted default values, or undefined if extraction fails
 */
export function resolveJsonSchemaDefaults<TForm extends Record<string, unknown>>(
  converter: StandardJSONSchemaV1.Converter,
  options?: JsonSchemaDefaultsOptions,
): TForm | undefined {
  const clone = options?.clone ?? defaultClone;

  try {
    const schema = converter.input({ target: 'draft-07' }) as JSONSchemaDraft07;
    return extractDefaultsFromSchema(schema, clone) as TForm | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Default clone function using structured clone with fallback to JSON parse/stringify.
 */
function defaultClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * Recursively extracts default values from a JSON Schema Draft-07 structure.
 */
function extractDefaultsFromSchema(schema: JSONSchemaDraft07, clone: <T>(value: T) => T): unknown {
  // Handle boolean schemas
  if (typeof schema === 'boolean') {
    return undefined;
  }

  // If the schema has a direct default, use it
  if ('default' in schema && schema.default !== undefined) {
    return clone(schema.default);
  }

  // Handle allOf by merging defaults from all schemas
  if (schema.allOf) {
    const merged: Record<string, unknown> = {};
    for (const subSchema of schema.allOf) {
      const subDefaults = extractDefaultsFromSchema(subSchema, clone);
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
      const subDefaults = extractDefaultsFromSchema(subSchema, clone);
      if (subDefaults !== undefined) {
        return subDefaults;
      }
    }
  }

  // Handle object type with properties
  if (schema.type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {};

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propDefault = extractDefaultsFromSchema(propSchema, clone);
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
