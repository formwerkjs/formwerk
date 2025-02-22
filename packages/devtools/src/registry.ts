import { FormField, FormReturns } from '@core/index';
import { initDevTools, refreshInspector } from './init';
import { onUnmounted, watch } from 'vue';
import { DevtoolsForm, DevtoolsRootForm } from './types';
import { getRootFormId } from './constants';

let TREE!: Map<string, DevtoolsForm | DevtoolsRootForm>;

export function getField(path: string, formId?: string) {
  if (!TREE) {
    return null;
  }

  if (formId) {
    return TREE.get(formId)?.fields.get(path) ?? null;
  }

  return TREE.get(getRootFormId())?.fields.get(path) ?? null;
}

export function getForm(formId?: string) {
  if (!TREE) {
    return null;
  }

  return TREE.get(formId ?? getRootFormId()) as DevtoolsForm | DevtoolsRootForm | undefined;
}

export function getRootFields() {
  if (!TREE) {
    return [];
  }

  const fields = getForm(getRootFormId())?.fields;
  if (!fields) {
    return [];
  }

  return Array.from(fields.values());
}

export function getAllForms() {
  if (!TREE) {
    return [];
  }

  return Array.from(TREE.values()).filter(node => !('_isRoot' in node)) as DevtoolsForm[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerField(field: FormField<any>, type: string) {
  const vm = initDevTools();
  const id = field.getPath() ?? field.getName() ?? '';
  const formId = field.form?.id ?? getRootFormId();

  if (!TREE) {
    TREE = new Map();
  }

  if (!TREE.has(formId)) {
    const node: DevtoolsForm | DevtoolsRootForm = {
      fields: new Map(),
    } as DevtoolsRootForm;

    if (formId === getRootFormId()) {
      (node as DevtoolsRootForm)._isRoot = true;
    }

    TREE.set(formId, node);
  }

  const form = TREE.get(formId ?? getRootFormId())!;

  form.fields.set(id, {
    ...field,
    _vm: vm,
    type,
  });

  watch(
    () => ({
      errors: field.errorMessage.value,
      isValid: field.isValid.value,
      isDirty: field.isDirty.value,
      touched: field.isTouched.value,
      value: field.fieldValue.value,
    }),
    refreshInspector,
    {
      deep: true,
    },
  );

  onUnmounted(() => {
    form.fields.delete(id);
    refreshInspector();
  });

  refreshInspector();
}

export function registerForm(form: FormReturns) {
  const vm = initDevTools();

  if (!TREE) {
    TREE = new Map();
  }

  if (!TREE.has(form.context.id)) {
    TREE.set(form.context.id, {
      _vm: vm,
      fields: new Map(),
      ...form,
    });
  }

  watch(
    () => ({
      errors: form.getErrors(),
      isValid: form.isValid(),
      isDirty: form.isDirty(),
      touched: form.isTouched(),
      values: form.values,
      isSubmitting: form.isSubmitting.value,
      submitAttemptsCount: form.submitAttemptsCount.value,
    }),
    refreshInspector,
    {
      deep: true,
    },
  );

  onUnmounted(() => {
    TREE.delete(form.context.id);
    refreshInspector();
  });

  refreshInspector();
}
