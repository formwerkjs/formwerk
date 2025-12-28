import { StandardSchemaV1 } from '@standard-schema/spec';
import type { CombinedStandardSchema } from './types';

/**
 * Combines standard schema with JSON standard schema.
 * Use this for schema libraries that don't expose ~standard.jsonSchema
 * Or ones that have an external JSON Schema converter.
 *
 * @example
 * // For valibot with @valibot/to-json-schema
 * import { toStandardJsonSchema } from '@valibot/to-json-schema';
 * const schema = withJsonSchema(valibotSchema, toStandardJsonSchema);
 *
 * @example
 * // For zod/mini
 * import * as zm from 'zod/mini';
 * const schema = withJsonSchema(zodMiniSchema, zm.toJSONSchema);
 *
 */
export function withJsonSchema<
  TInput,
  TOutput,
  TSchema extends StandardSchemaV1<TInput, TOutput> = StandardSchemaV1<TInput, TOutput>,
>(schema: TSchema, toJsonSchema: (s: TSchema) => CombinedStandardSchema<TInput, TOutput>): TSchema {
  const jsonSchema = toJsonSchema(schema);

  return {
    ...schema,
    '~standard': {
      ...schema['~standard'],
      ...jsonSchema['~standard'],
    },
  } satisfies CombinedStandardSchema<TInput, TOutput>;
}
