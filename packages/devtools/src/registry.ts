import { FormField, FormReturns } from '@core/index';
import { initDevTools, refreshInspector } from './init';
import { onUnmounted, watch } from 'vue';
import { DevtoolsForm, DevtoolsRootForm } from './types';
import { ROOT_FORM_ID } from './config';

let TREE!: Map<string, DevtoolsForm | DevtoolsRootForm>;

export function getField(path: string, formId?: string) {
  if (!TREE) {
    return null;
  }

  if (formId) {
    return TREE.get(formId)?.fields.get(path) ?? null;
  }

  return TREE.get(ROOT_FORM_ID)?.fields.get(path) ?? null;
}

export function getForm(formId?: string) {
  if (!TREE) {
    return null;
  }

  return TREE.get(formId ?? ROOT_FORM_ID) as DevtoolsForm | DevtoolsRootForm | undefined;
}

export function getRootFields() {
  if (!TREE) {
    return [];
  }

  const fields = getForm(ROOT_FORM_ID)?.fields;
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

export function registerField(field: FormField<unknown>, type: string) {
  const vm = initDevTools();
  const id = field.getPath() ?? field.getName() ?? '';
  const formId = field.form?.id ?? ROOT_FORM_ID;

  if (!TREE) {
    TREE = new Map();
  }

  if (!TREE.has(formId)) {
    const node: DevtoolsForm | DevtoolsRootForm = {
      fields: new Map(),
    } as DevtoolsRootForm;

    if (formId === ROOT_FORM_ID) {
      (node as DevtoolsRootForm)._isRoot = true;
    }

    TREE.set(formId, node);
  }

  const form = TREE.get(formId ?? ROOT_FORM_ID)!;

  form.fields.set(id, {
    ...field,
    _vm: vm,
    type,
  });

  watch(
    () => ({
      errors: field.errorMessage.value,
      isValid: !field.errorMessage.value,
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

export function registerFormWithDevTools(form: FormReturns) {
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

  onUnmounted(() => {
    TREE.delete(form.context.id);
    refreshInspector();
  });

  refreshInspector();
}
