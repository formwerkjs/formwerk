import type { FieldState as CoreFieldState, FormReturns, IssueCollection } from '@core/index';
import { ComponentInternalInstance } from 'vue';

interface BaseState<TValue = unknown> {
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  errors: string[];
  value: TValue;
}

// Base interface for state
export interface PathState<TValue = unknown> extends BaseState<TValue> {
  type: 'path';
  path: string;
  formId?: string;
}

// Form state extending base state
export interface FormState extends BaseState {
  id: string;
  isSubmitting: boolean;
  submitCount: number;
  issues: IssueCollection[];
  type: 'form';
}

// Field state extending base state
export interface FieldState<TValue = unknown> extends BaseState<TValue> {
  path: string;
  name: string;
  formId?: string;
  type: 'field';
}

// Union type for node state
export type NodeState = FormState | FieldState | PathState;

// Devtools field type
export type DevtoolsField = CoreFieldState<unknown> & { type: string; _vm?: ComponentInternalInstance | null };

// Devtools form type
export type DevtoolsForm = FormReturns & {
  _vm?: ComponentInternalInstance | null;
  fields: Map<string, DevtoolsField>;
};

export type DevtoolsRootForm = {
  fields: Map<string, DevtoolsField>;
  _isRoot: true;
};

// Encoded node type
export type EncodedNode = {
  type: NodeState['type'] | 'unknown';
  ff: string; // form field
  f: string; // form id
  fp: string; // form path
};

// Functions to convert form and field to state
export function formToState(form: FormReturns): FormState {
  return {
    id: form.context.id,
    touched: form.isTouched(),
    dirty: form.isDirty(),
    isSubmitting: form.isSubmitting.value,
    submitCount: form.submitAttemptsCount.value,
    valid: form.isValid(),
    value: form.values,
    errors: form.getErrors(),
    issues: form.getIssues(),
    type: 'form',
  };
}

export function fieldToState(field: CoreFieldState<unknown>, formId?: string): FieldState<unknown> {
  return {
    path: field.getPath() ?? '',
    name: field.getName() ?? '',
    touched: field.isTouched.value,
    dirty: field.isDirty.value,
    valid: !!field.isValid.value,
    value: field.fieldValue,
    errors: field.errors.value.map(error => error?.[0]),
    formId,
    type: 'field',
  };
}
