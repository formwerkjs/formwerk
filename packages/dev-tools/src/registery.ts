import { initDevTools, refreshInspector } from './init';
import { onUnmounted } from 'vue';
import { FormContext, TextField } from './types';
import { DEVTOOLS_FIELDS, DEVTOOLS_FORMS } from './storage';

export function registerTextFieldWithDevtools(field: TextField, formId?: string) {
  const vm = initDevTools();

  const id = field.getPath() ?? field.getName() ?? '';

  // if the field is part of a form, we need to register to add the field to the form
  if (formId && DEVTOOLS_FORMS[formId]) {
    DEVTOOLS_FORMS[formId].children = DEVTOOLS_FORMS[formId].children ?? [];
    DEVTOOLS_FORMS[formId].children.push({
      ...field,
      _vm: vm,
    });
  } else {
    // if the field is a standalone field, we need to register it
    DEVTOOLS_FIELDS[id] = { ...field, _vm: vm };
  }

  onUnmounted(() => {
    delete DEVTOOLS_FIELDS[id];
    refreshInspector();
  });

  refreshInspector();
}

export function registerFormWithDevTools(form: FormContext) {
  const vm = initDevTools();

  DEVTOOLS_FORMS[form.context.id] = { ...form };
  DEVTOOLS_FORMS[form.context.id]._vm = vm;
  onUnmounted(() => {
    delete DEVTOOLS_FORMS[form.context.id];
    refreshInspector();
  });

  refreshInspector();
}
