import { Schema, Simplify } from 'type-fest';
import type { StandardSchemaV1, StandardJSONSchemaV1 } from '@standard-schema/spec';
import { FormObject } from './common';
import { Path } from './paths';
import { FormValidationMode } from '../useForm/formContext';

type CombinedStandardSchema<TInput = unknown, TOutput = TInput> = {
  '~standard': StandardSchemaV1<TInput, TOutput>['~standard'] &
    Partial<StandardJSONSchemaV1<TInput, TOutput>['~standard']>;
};

export type StandardIssue = StandardSchemaV1.Issue;

export type StandardSchema<TInput = unknown, TOutput = TInput> = CombinedStandardSchema<TInput, TOutput>;

export type GenericFormSchema = StandardSchema<FormObject>;

export type FormSchema<TInput extends FormObject = FormObject, TOutput = TInput> = StandardSchema<TInput, TOutput>;

export type TouchedSchema<TForm extends FormObject> = Simplify<Schema<TForm, boolean>>;

export type DirtySchema<TForm extends FormObject> = Simplify<Schema<TForm, boolean>>;

export type BlurredSchema<TForm extends FormObject> = Simplify<Schema<TForm, boolean>>;

export type DisabledSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, boolean>>;

export type ErrorsSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, string[]>>;

export type IssueCollection<TPath = string> = {
  path: TPath;
  messages: string[];
};

type BaseValidationResult = {
  isValid: boolean;
  errors: IssueCollection[];
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
