import { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';

export type CombinedStandardSchema<TInput = unknown, TOutput = TInput> = {
  '~standard'?: StandardSchemaV1<TInput, TOutput>['~standard'] &
    Partial<StandardJSONSchemaV1<TInput, TOutput>['~standard']>;
};
