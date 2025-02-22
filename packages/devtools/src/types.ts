import type { FormField, FormReturns } from '@core/index';
import { ComponentInternalInstance } from 'vue';

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
export type NodeState = FormState | FieldState | PathState;

// Devtools field type
export type DevtoolsField = FormField<unknown> & { type: string; _vm?: ComponentInternalInstance | null };

// Devtools form type
export type DevtoolsForm = FormReturns & {
  _vm?: ComponentInternalInstance | null;
  fields: Map<string, DevtoolsField>;
};

export type DevtoolsRootForm = {
  fields: Map<string, DevtoolsField>;
  _isRoot: true;
};

// Devtools field type

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
export const formToState = (form: FormReturns): FormState => {
  const errors = form.getErrors();

  return {
    id: form.context.id,
    touched: form.isTouched(),
    dirty: form.isDirty(),
    valid: errors.length === 0,
    value: form.values,
    errors,
  };
};

export const fieldToState = (field: FormField<unknown>, formId?: string): FieldState<unknown> => {
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
