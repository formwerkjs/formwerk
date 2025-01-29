import { initDevTools, refreshInspector } from './init';
import { onUnmounted, watch } from 'vue';
import { CheckboxField, FIELD_TYPES, FormContext, RadioField, TextField } from './types';
import { DEVTOOLS_FIELDS, DEVTOOLS_FORMS } from './storage';

export function registerTextFieldWithDevtools(field: Omit<TextField, 'type'>) {
  const vm = initDevTools();

  const id = field.getPath() ?? field.getName() ?? '';
  const formId = field.form?.id;

  // if the field is part of a form, we need to register to add the field to the form
  if (formId && DEVTOOLS_FORMS[formId]) {
    DEVTOOLS_FORMS[formId].children = DEVTOOLS_FORMS[formId].children ?? [];
    DEVTOOLS_FORMS[formId].children.push({
      ...field,
      type: FIELD_TYPES.TextField,
      _vm: vm,
    });
  } else {
    // if the field is a standalone field, we need to register it
    DEVTOOLS_FIELDS[id] = { ...field, type: FIELD_TYPES.TextField, _vm: vm };
  }

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
    delete DEVTOOLS_FIELDS[id];
    refreshInspector();
  });

  refreshInspector();
}

export function registerCheckboxWithDevtools(field: Omit<CheckboxField, 'type'>) {
  const vm = initDevTools();

  const id = field.getPath() ?? field.getName() ?? '';
  const formId = field.form?.id;
  // if the field is part of a form, we need to register to add the field to the form
  if (formId && DEVTOOLS_FORMS[formId]) {
    DEVTOOLS_FORMS[formId].children = DEVTOOLS_FORMS[formId].children ?? [];
    DEVTOOLS_FORMS[formId].children.push({
      ...field,
      type: FIELD_TYPES.Checkbox,
      _vm: vm,
    });
  } else {
    // if the field is a standalone field, we need to register it
    DEVTOOLS_FIELDS[id] = { ...field, type: FIELD_TYPES.Checkbox, _vm: vm };
  }

  watch(
    () => ({
      errors: field.errors.value,
      isValid: !field.errorMessage.value,
      value: field.fieldValue.value,
    }),
    refreshInspector,
    {
      deep: true,
    },
  );

  onUnmounted(() => {
    delete DEVTOOLS_FIELDS[id];
    refreshInspector();
  });

  refreshInspector();
}

export function registerRadioWithDevtools(field: Omit<RadioField, 'type'>) {
  const vm = initDevTools();

  const id = field.getPath() ?? field.getName() ?? '';
  const formId = field.form?.id;
  // if the field is part of a form, we need to register to add the field to the form
  if (formId && DEVTOOLS_FORMS[formId]) {
    DEVTOOLS_FORMS[formId].children = DEVTOOLS_FORMS[formId].children ?? [];
    DEVTOOLS_FORMS[formId].children.push({
      ...field,
      type: FIELD_TYPES.Radio,
      _vm: vm,
    });
  } else {
    // if the field is a standalone field, we need to register it
    DEVTOOLS_FIELDS[id] = { ...field, type: FIELD_TYPES.Radio, _vm: vm };
  }

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
