import { CustomInspectorNode, CustomInspectorState, InspectorNodeTag } from '@vue/devtools-kit';
import {
  DevtoolsField,
  DevtoolsForm,
  EncodedNode,
  fieldToState,
  formToState,
  NODE_TYPE,
  NodeState,
  PathState,
} from './types';
import type { FormReturns, FormField } from '@core/index';
import { ComponentInternalInstance, toValue } from 'vue';
import { getPluginColors } from './constants';
import { brandMessage, buildFormTree } from './utils';
import { setInPath } from '@core/utils/path';
import { getField, getForm } from './registry';

export function buildFieldState(
  state: Pick<PathState, 'errors' | 'touched' | 'dirty' | 'value' | 'valid'>,
): CustomInspectorState {
  return {
    'Field state': [
      { key: 'errors', value: state.errors },
      {
        key: 'currentValue',
        value: state.value,
      },
      {
        key: 'touched',
        value: state.touched,
      },
      {
        key: 'dirty',
        value: state.dirty,
      },
      {
        key: 'valid',
        value: state.valid,
      },
    ],
  };
}

export function buildFormState(form: FormReturns): CustomInspectorState {
  const { isSubmitting, isTouched, isDirty, isValid, submitAttemptsCount, values, getErrors } = form;

  return {
    'Form state': [
      {
        key: 'submitCount',
        value: submitAttemptsCount.value,
      },
      {
        key: 'isSubmitting',
        value: isSubmitting.value,
      },
      {
        key: 'touched',
        value: isTouched(),
      },
      {
        key: 'dirty',
        value: isDirty(),
      },
      {
        key: 'valid',
        value: isValid(),
      },
      {
        key: 'currentValues',
        value: values,
      },
      {
        key: 'errors',
        value: getErrors(),
      },
    ],
  };
}

export function encodeNodeId(nodeState?: NodeState): string {
  const type = (() => {
    if (!nodeState) {
      return 'unknown';
    }

    if ('id' in nodeState) {
      return 'form';
    } else if ('path' in nodeState) {
      return 'field';
    } else {
      return 'pathState';
    }
  })();

  const ff = (() => {
    if (!nodeState) {
      return '';
    }

    if ('path' in nodeState) {
      return nodeState.path;
    } else {
      return '';
    }
  })();

  const form = (() => {
    if (!nodeState) {
      return '';
    }

    if ('id' in nodeState) {
      return nodeState.id;
    }

    if ('formId' in nodeState && nodeState.formId) {
      return nodeState.formId;
    }

    return '';
  })();

  const idObject = { f: form, ff, type } satisfies EncodedNode;

  return btoa(encodeURIComponent(JSON.stringify(idObject)));
}

export function decodeNodeId(nodeId: string): {
  field?: FormField<unknown> & { _vm?: ComponentInternalInstance | null };
  form?: FormReturns & { _vm?: ComponentInternalInstance | null };
  state?: PathState;
  type?: NODE_TYPE;
} {
  try {
    const idObject = JSON.parse(decodeURIComponent(atob(nodeId))) as EncodedNode;
    const form = getForm(idObject.f);

    // standalone field
    if (!form && idObject.ff) {
      const field = getField(idObject.ff);
      if (!field) {
        return {};
      }

      return {
        type: idObject.type,
        field,
      };
    }

    if (!form || '_isRoot' in form) {
      return {};
    }

    const field = form.fields.get(idObject.ff);
    const state = formToState(form);

    return {
      type: idObject.type,
      form,
      state,
      field,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    console.error(brandMessage(`Failed to parse node id ${nodeId}`));
  }

  return {};
}

/**
 * Resolves the tag color based on the form state
 */
export function getValidityColors(valid: boolean) {
  const COLORS = getPluginColors();

  return {
    bgColor: valid ? COLORS.success : COLORS.error,
    textColor: valid ? COLORS.black : COLORS.white,
  };
}

export function getFieldNodeTags(field: DevtoolsField, valid: boolean) {
  const { textColor, bgColor } = getValidityColors(valid);
  const COLORS = getPluginColors();

  return [
    {
      label: 'Field',
      textColor,
      backgroundColor: bgColor,
    },
    {
      label: field.type,
      textColor: COLORS.black,
      backgroundColor: COLORS.gray,
    },
  ].filter(Boolean) as InspectorNodeTag[];
}

export function mapFormForDevtoolsInspector(form: DevtoolsForm): CustomInspectorNode {
  const { textColor, bgColor } = getValidityColors(form.isValid());
  const formState = formToState(form);

  const formTreeNodes = {};
  form.fields?.forEach(state => {
    setInPath(formTreeNodes, toValue(state.getPath() ?? ''), mapFieldForDevtoolsInspector(state, form));
  });

  const { children } = buildFormTree(formTreeNodes);

  return {
    id: encodeNodeId(formState),
    label: form.context.id,
    children,
    tags: [
      {
        label: 'Form',
        textColor,
        backgroundColor: bgColor,
      },
    ],
  };
}

export function mapFieldForDevtoolsInspector(field: DevtoolsField, form?: DevtoolsForm): CustomInspectorNode {
  const fieldState = fieldToState(field, form?.context.id);

  return {
    id: encodeNodeId(fieldState),
    label: fieldState.name,
    tags: getFieldNodeTags(field, fieldState.valid),
  };
}
