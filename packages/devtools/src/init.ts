import { App, getCurrentInstance, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { throttle } from 'packages/shared/src';
import { FormField, FormReturns } from '@core/index';
import { isSSR } from '@core/utils/common';
import { PathState } from './types';
import {
  buildFieldState,
  buildFormState,
  decodeNodeId,
  mapFieldForDevtoolsInspector,
  mapFormForDevtoolsInspector,
} from './helpers';
import { getInspectorId } from './constants';
import { getAllForms, getRootFields, registerField as _registerField, registerForm as _registerForm } from './registry';
import { brandMessage } from './utils';

let SELECTED_NODE:
  | { type: 'form'; form: FormReturns }
  | { type: 'field'; field: FormField<unknown> }
  | null
  | {
      type: 'pathState';
      state: PathState;
      form: FormReturns;
    } = null;

/**
 * Plugin API
 */
let API: any;

async function installDevtoolsPlugin(app: App) {
  // TODO: Figure out multiple ways to find out if we are in dev mode
  if (__DEV__) {
    if (!isSSR) {
      const INSPECTOR_ID = getInspectorId();
      const devtools = await import('@vue/devtools-api');
      devtools.setupDevtoolsPlugin(
        {
          app,
          id: 'formwerk-devtools-plugin',
          label: 'Formwerk',
          packageName: 'formwerk',
          homepage: 'https://formwerk.dev/',
          logo: 'https://formwerk.dev/logo-w.svg',
        },
        api => {
          API = api;

          api.addInspector({
            id: INSPECTOR_ID,
            icon: 'https://formwerk.dev/logo-w.svg',
            label: 'Formwerk',
            noSelectionText: 'Select a formwerk node to inspect',
            actions: [
              {
                icon: 'done_outline',
                tooltip: 'Validate selected item',
                action: async () => {
                  if (!SELECTED_NODE) {
                    console.error(brandMessage('There is not a valid selected Formwerk node or component'));
                    return;
                  }

                  if (SELECTED_NODE.type === 'form') {
                    SELECTED_NODE.form.validate();
                    return;
                  }

                  if (SELECTED_NODE.type === 'field') {
                    SELECTED_NODE.field.validate();
                    return;
                  }

                  console.warn(brandMessage('Validating a non-field or form path is not yet implemented'));
                },
              },
              {
                icon: 'replay',
                tooltip: 'Reset selected item to its initial state',
                action: () => {
                  if (!SELECTED_NODE) {
                    console.error(brandMessage('There is not a valid selected Formwerk node or component'));
                    return;
                  }

                  if (SELECTED_NODE.type === 'form') {
                    SELECTED_NODE.form.reset();
                    return;
                  }

                  console.warn(brandMessage('Resetting a non-field or form path is not yet implemented'));
                },
              },
            ],
          });

          api.on.getInspectorTree(payload => {
            if (payload.inspectorId !== INSPECTOR_ID) {
              return;
            }

            const forms = getAllForms();
            const fields = getRootFields().filter(f => {
              if (!payload.filter) {
                return true;
              }

              return f.getName()?.toLowerCase().includes(payload.filter.toLowerCase()) ?? false;
            });

            payload.rootNodes = [
              ...forms.map(form => mapFormForDevtoolsInspector(form, payload.filter)),
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
}

const refreshInspector = throttle(() => {
  const INSPECTOR_ID = getInspectorId();

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerField(field: FormField<any>, type: string) {
  onMounted(async () => {
    const vm = initDevTools();
    // Makes sure forms are registered before fields in same component contexts
    await nextTick();
    const watchable = _registerField(field, type, vm);
    watch(watchable, refreshInspector, {
      deep: true,
    });

    setTimeout(refreshInspector, 500);
  });

  onUnmounted(refreshInspector);
}

export function registerForm(form: FormReturns) {
  onMounted(() => {
    const vm = initDevTools();
    const watchable = _registerForm(form, vm);

    watch(watchable, refreshInspector, {
      deep: true,
    });

    setTimeout(refreshInspector, 500);
  });

  onUnmounted(refreshInspector);
}
