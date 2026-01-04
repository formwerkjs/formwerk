import { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';

export type CombinedProps<Input = unknown, Output = Input> = StandardSchemaV1.Props<Input, Output> &
  Partial<StandardJSONSchemaV1.Props<Input, Output>>;

/**
 * An interface that combines StandardJSONSchema and StandardSchema.
 * */
export interface CombinedStandardSchema<Input = unknown, Output = Input> {
  '~standard': CombinedProps<Input, Output>;
}
