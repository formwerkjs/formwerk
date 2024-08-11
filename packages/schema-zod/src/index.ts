import { ZodObject, input, output, ZodDefault, ZodSchema, ParseParams, ZodIssue } from 'zod';
import { PartialDeep } from 'type-fest';
import type { TypedSchema, TypedSchemaError } from '@formwerk/core';
import { isObject, merge } from '../../shared/src';

/**
 * Transforms a Zod object schema to Yup's schema
 */
export function defineSchema<
  TSchema extends ZodSchema,
  TOutput = output<TSchema>,
  TInput = PartialDeep<input<TSchema>>,
>(zodSchema: TSchema, opts?: Partial<ParseParams>): TypedSchema<TInput, TOutput> {
  const schema: TypedSchema = {
    async parse(value) {
      const result = await zodSchema.safeParseAsync(value, opts);
      if (result.success) {
        return {
          output: result.data,
          errors: [],
        };
      }

      const errors: Record<string, TypedSchemaError> = {};
      processIssues(result.error.issues, errors);

      return {
        errors: Object.values(errors),
      };
    },
    defaults(values) {
      try {
        return zodSchema.parse(values);
      } catch {
        // Zod does not support "casting" or not validating a value, so next best thing is getting the defaults and merging them with the provided values.
        const defaults = getDefaults(zodSchema);
        if (isObject(defaults) && isObject(values)) {
          return merge(defaults, values);
        }

        return values;
      }
    },
  };

  return schema;
}

function processIssues(issues: ZodIssue[], errors: Record<string, TypedSchemaError>): void {
  issues.forEach(issue => {
    const path = issue.path.join('.');
    if (issue.code === 'invalid_union') {
      processIssues(
        issue.unionErrors.flatMap(ue => ue.issues),
        errors,
      );

      if (!path) {
        return;
      }
    }

    if (!errors[path]) {
      errors[path] = { messages: [], path };
    }

    errors[path].messages.push(issue.message);
  });
}

// Zod does not support extracting default values so the next best thing is manually extracting them.
// https://github.com/colinhacks/zod/issues/1944#issuecomment-1406566175
function getDefaults<Schema extends ZodSchema>(schema: Schema): unknown {
  if (!(schema instanceof ZodObject)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(schema.shape).map(([key, value]) => {
      if (value instanceof ZodDefault) {
        return [key, value._def.defaultValue()];
      }

      if (value instanceof ZodObject) {
        return [key, getDefaults(value)];
      }

      return [key, undefined];
    }),
  );
}
