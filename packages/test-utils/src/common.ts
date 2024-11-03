import { v1 } from '@standard-schema/spec';

export function defineStandardSchema<TInput, TOutput = TInput>(validate: v1.StandardValidate<TOutput>) {
  const schema: v1.StandardSchema<TInput, TOutput> = {
    '~standard': 1,
    '~vendor': 'custom',
    '~validate': validate,
  };

  return schema;
}
