import { FormObject } from './common';

export interface TypedSchemaError {
  path: string;
  messages: string[];
}

export interface TypedSchemaContext {
  formData: FormObject;
}

export interface TypedSchema<TInput = any, TOutput = TInput> {
  parse(values: TInput, context?: TypedSchemaContext): Promise<{ output?: TOutput; errors: TypedSchemaError[] }>;
  defaults?(values: TInput): TInput;
}

export type InferOutput<TSchema extends TypedSchema> =
  TSchema extends TypedSchema<any, infer TOutput> ? TOutput : never;

export type InferInput<TSchema extends TypedSchema> = TSchema extends TypedSchema<infer TInput, any> ? TInput : never;
