import { useForm } from '@core/useForm';
import { FormField, useFormField } from '@core/useFormField';
import { ComponentInternalInstance } from 'vue';
import { useTextField } from '@core/useTextField';
import { DEVTOOLS_FIELDS } from './storage';

// Base interface for state
export interface PathState<TValue = unknown> {
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  errors: string[];
  value: TValue;
}

// Form state extending base state
export interface FormState extends PathState {
  id: string;
}

// Field state extending base state
export interface FieldState<TValue = unknown> extends PathState<TValue> {
  path: string;
  name: string;
  formId?: string;
}

// Union type for node state
export type NodeState = FormState | FieldState;

// Form context type
export type FormContext = ReturnType<typeof useForm>;

// Text field type combining form field and text field
export type TextField = ReturnType<typeof useTextField> & ReturnType<typeof useFormField<string | undefined>>;

// Input field type
export type InputField = FormField<unknown> | TextField;

// Devtools form type
export type DevtoolsForm = FormContext & {
  children?: (typeof DEVTOOLS_FIELDS)[keyof typeof DEVTOOLS_FIELDS][];
  _vm?: ComponentInternalInstance | null;
};

// Devtools field type
export type DevtoolsField = InputField & { _vm?: ComponentInternalInstance | null };

// Node types
export const NODE_TYPES = {
  form: 'form',
  field: 'field',
  pathState: 'pathState',
  unknown: 'unknown',
} as const;

export type NODE_TYPE = keyof typeof NODE_TYPES;

// Encoded node type
export type EncodedNode = {
  type: NODE_TYPE;
  ff: string; // form field path
  f: string; // form id
};

// Functions to convert form and field to state
export const formToState = (form: FormContext): FormState => {
  return {
    id: form.context.id,
    touched: form.isTouched.value,
    dirty: form.isDirty.value,
    valid: !!form.validate(),
    value: form.values,
    errors: form.getErrors().map(error => error.messages[0]),
  };
};

export const fieldToState = (field: InputField, formId?: string): FieldState<unknown> => {
  return {
    path: field.getPath() ?? '',
    name: field.getName() ?? '',
    touched: field.isTouched.value,
    dirty: field.isDirty.value,
    valid: !!field.isValid.value,
    value: field.fieldValue,
    errors: field.errors.value.map(error => error?.[0]),
    formId,
  };
};
