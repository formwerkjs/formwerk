import { Schema, Simplify } from 'type-fest';
import { FormObject } from './common';
import { Path } from './paths';
import { TypedSchemaError } from './typedSchema';

export type TouchedSchema<TForm extends FormObject> = Simplify<Schema<TForm, boolean>>;

export type DisabledSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, boolean>>;

export type ErrorsSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, string[]>>;

export type ValidationResult = {
  isValid: boolean;
  errors: TypedSchemaError[];
};
