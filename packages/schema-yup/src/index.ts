import { InferType, Schema, ValidateOptions, ValidationError } from 'yup';
import type { PartialDeep } from 'type-fest';
import { TypedSchema, TypedSchemaError } from '@formwerk/core';
import { isObject, merge } from '../../shared/src';

export function defineSchema<TSchema extends Schema, TOutput = InferType<TSchema>, TInput = PartialDeep<TOutput>>(
  yupSchema: TSchema,
  opts: ValidateOptions = { abortEarly: false },
): TypedSchema<TInput, TOutput> {
  const schema: TypedSchema = {
    async parse(values) {
      try {
        // we spread the options because yup mutates the opts object passed
        const output = await yupSchema.validate(values, { ...opts });

        return {
          output,
          errors: [],
        };
      } catch (err) {
        const error = err as ValidationError;
        // Yup errors have a name prop one them.
        // https://github.com/jquense/yup#validationerrorerrors-string--arraystring-value-any-path-string
        if (error.name !== 'ValidationError') {
          throw err;
        }

        if (!error.inner?.length && error.errors.length) {
          return { errors: [{ path: error.path as string, messages: error.errors }] };
        }

        const errors: Record<string, TypedSchemaError> = error.inner.reduce(
          (acc, curr) => {
            const path = curr.path || '';
            if (!acc[path]) {
              acc[path] = { messages: [], path };
            }

            acc[path].messages.push(...curr.errors);

            return acc;
          },
          {} as Record<string, TypedSchemaError>,
        );

        // list of aggregated errors
        return { errors: Object.values(errors) };
      }
    },
    defaults(values) {
      try {
        return yupSchema.cast(values);
      } catch {
        const defaults = yupSchema.getDefault();
        if (isObject(defaults) && isObject(values)) {
          return merge(defaults, values);
        }

        return values;
      }
    },
  };

  return schema;
}
