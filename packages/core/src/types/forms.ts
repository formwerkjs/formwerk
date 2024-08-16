import { Schema, Simplify } from 'type-fest';
import { FormObject } from './common';
import { Path } from './paths';
import { TypedSchemaError } from './typedSchema';
import { FormValidationMode } from '../useForm/formContext';

export type TouchedSchema<TForm extends FormObject> = Simplify<Schema<TForm, boolean>>;

export type DisabledSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, boolean>>;

export type ErrorsSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, string[]>>;

type BaseValidationResult = {
  isValid: boolean;
  errors: TypedSchemaError[];
};

export interface ValidationResult<TValue = unknown> extends BaseValidationResult {
  type: 'FIELD';
  output: TValue;
  path: string;
}

export interface GroupValidationResult<TOutput extends FormObject = FormObject> extends BaseValidationResult {
  type: 'GROUP';
  path: string;
  output: TOutput;
  mode: FormValidationMode;
}

export interface FormValidationResult<TOutput extends FormObject = FormObject> extends BaseValidationResult {
  type: 'FORM';
  output: TOutput;
  mode: FormValidationMode;
}

export type AnyValidationResult = GroupValidationResult | ValidationResult;
