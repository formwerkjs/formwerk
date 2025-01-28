import { App, getCurrentInstance, nextTick } from 'vue';
import { throttle } from 'packages/shared/src';
import { isClient } from './assertions';
import { DEVTOOLS_FIELDS, DEVTOOLS_FORMS, INSPECTOR_ID } from './storage';
import { FormContext, InputField, PathState } from './types';
import {
  buildFieldState,
  buildFormState,
  decodeNodeId,
  mapFieldForDevtoolsInspector,
  mapFormForDevtoolsInspector,
} from './helper';

let SELECTED_NODE:
  | { type: 'form'; form: FormContext }
  | { type: 'field'; field: InputField }
  | null
  | {
      type: 'pathState';
      state: PathState;
      form: FormContext;
    } = null;

/**
 * Plugin API
 */
let API: any;

async function installDevtoolsPlugin(app: App) {
  if (__DEV__) {
    if (!isClient) {
      return;
    }

    const devtools = await import('@vue/devtools-api');
    devtools.setupDevtoolsPlugin(
      {
        id: 'formwerk-devtools-plugin',
        label: 'Formwerk Plugin',
        packageName: 'formwerk',
        homepage: 'https://formwerk.dev/',
        app,
        logo: 'https://formwerk.dev/_astro/logo-dark.0cuv1M4O.svg',
      },
      api => {
        API = api;

        api.addInspector({
          id: INSPECTOR_ID,
          icon: 'rule',
          label: 'formwerk',
          noSelectionText: 'Select a formwerk node to inspect',
          actions: [
            {
              icon: 'done_outline',
              tooltip: 'Formwerk selected item',
              action: async () => {
                if (!SELECTED_NODE) {
                  console.error('There is not a valid selected vee-validate node or component');
                  return;
                }
              },
            },
            {
              icon: 'delete_sweep',
              tooltip: 'Clear validation state of the selected item',
              action: () => {
                if (!SELECTED_NODE) {
                  console.error('There is not a valid selected vee-validate node or component');
                  return;
                }
              },
            },
          ],
        });

        api.on.getInspectorTree(payload => {
          if (payload.inspectorId !== INSPECTOR_ID) {
            return;
          }

          const forms = Object.values(DEVTOOLS_FORMS);
          const fields = Object.values(DEVTOOLS_FIELDS);

          payload.rootNodes = [
            ...forms.map(mapFormForDevtoolsInspector),
            ...fields.map(field => mapFieldForDevtoolsInspector(field)),
          ];
        });

        api.on.getInspectorState(payload => {
          if (payload.inspectorId !== INSPECTOR_ID) {
            return;
          }

          const { form, field, state, type } = decodeNodeId(payload.nodeId);

          api.unhighlightElement();

          if (form && type === 'form') {
            payload.state = buildFormState(form);
            SELECTED_NODE = { type: 'form', form };
            api.highlightElement(form._vm);
            return;
          }

          if (state && type === 'pathState' && form) {
            payload.state = buildFieldState(state);
            SELECTED_NODE = { type: 'pathState', state, form };
            return;
          }

          if (field && type === 'field') {
            payload.state = buildFieldState({
              errors: field.errors.value,
              dirty: field.isDirty.value,
              valid: field.isValid.value,
              touched: field.isTouched.value,
              value: field.fieldValue.value,
            });
            SELECTED_NODE = { field, type: 'field' };
            api.highlightElement(field._vm);
            return;
          }

          SELECTED_NODE = null;
          api.unhighlightElement();
        });
      },
    );
  }
}

export const refreshInspector = throttle(() => {
  setTimeout(async () => {
    await nextTick();
    API?.sendInspectorState(INSPECTOR_ID);
    API?.sendInspectorTree(INSPECTOR_ID);
  }, 100);
}, 100);

export function initDevTools() {
  const vm = getCurrentInstance();
  if (!API) {
    const app = vm?.appContext.app;
    if (!app) {
      return;
    }

    installDevtoolsPlugin(app as unknown as App);
  }

  return vm;
}
