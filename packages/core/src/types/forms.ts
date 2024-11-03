import { Schema, Simplify } from 'type-fest';
import type { v1 } from '@standard-schema/spec';
import { FormObject } from './common';
import { Path } from './paths';
import { FormValidationMode } from '../useForm/formContext';

export type StandardIssue = v1.StandardIssue;

export type StandardSchema<TInput = unknown, TOutput = TInput> = v1.StandardSchema<TInput, TOutput>;

export type FormSchema = StandardSchema<FormObject>;

export type TouchedSchema<TForm extends FormObject> = Simplify<Schema<TForm, boolean>>;

export type DisabledSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, boolean>>;

export type ErrorsSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, string[]>>;

export type SimpleIssue = {
  path: string;
  message: string | null;
};

type BaseValidationResult = {
  isValid: boolean;
  errors: SimpleIssue[];
};

export interface ValidationResult<TValue = unknown> extends BaseValidationResult {
  type: 'FIELD';
  path: string;
  output?: TValue;
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
