import { CustomInspectorNode, CustomInspectorState, InspectorNodeTag } from '@vue/devtools-kit';
import {
  DevtoolsField,
  DevtoolsForm,
  EncodedNode,
  FieldState,
  fieldToState,
  FormState,
  formToState,
  NodeState,
  PathState,
} from './types';
import { toValue } from 'vue';
import { getPluginColors } from './constants';
import { brandMessage, buildFormTree } from './utils';
import { setInPath } from '@core/utils/path';
import { getField, getForm } from './registry';

export function buildFieldState(state: FieldState | PathState): CustomInspectorState {
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

export function buildFormState(form: FormState): CustomInspectorState {
  return {
    'Form state': [
      {
        key: 'submitCount',
        value: form.submitCount,
      },
      {
        key: 'isSubmitting',
        value: form.isSubmitting,
      },
      {
        key: 'touched',
        value: form.touched,
      },
      {
        key: 'dirty',
        value: form.dirty,
      },
      {
        key: 'valid',
        value: form.valid,
      },
      {
        key: 'currentValues',
        value: form.value,
      },
      {
        key: 'errors',
        value: form.errors,
      },
    ],
  };
}

export function encodeNodeId(nodeState?: NodeState): string {
  const ff = (() => {
    if (nodeState?.type !== 'field') {
      return '';
    }

    return nodeState.path;
  })();

  const fp = (() => {
    if (nodeState?.type !== 'path') {
      return '';
    }

    return nodeState.path;
  })();

  const form = (() => {
    if (!nodeState) {
      return '';
    }

    if (nodeState.type === 'form') {
      return nodeState.id;
    }

    if (nodeState.type === 'field' || nodeState.type === 'path') {
      return nodeState.formId ?? '';
    }

    return '';
  })();

  const idObject = { f: form, ff, fp, type: nodeState?.type ?? 'unknown' } satisfies EncodedNode;

  return btoa(encodeURIComponent(JSON.stringify(idObject)));
}

export function decodeNode(nodeId: string): NodeState | null {
  try {
    const idObject = JSON.parse(decodeURIComponent(atob(nodeId))) as EncodedNode;

    if (idObject.type === 'field') {
      if (!idObject.ff) {
        return null;
      }

      const field = getField(idObject.ff, idObject.f);
      if (!field) {
        return null;
      }

      return fieldToState(field, idObject.f);
    }

    if (idObject.type === 'path') {
      if (!idObject.fp) {
        return null;
      }

      const form = getForm(idObject.f);

      // Should not happen, path should always be relative to a form
      if (!form || '_isRoot' in form) {
        return null;
      }

      return {
        type: 'path',
        path: idObject.fp,
        formId: idObject.f,
        touched: form.isTouched(idObject.fp),
        dirty: form.isDirty(idObject.fp),
        valid: form.isValid(idObject.fp),
        errors: form.getErrors(idObject.fp),
        value: form.getValue(idObject.fp),
      };
    }

    if (idObject.type === 'form') {
      const form = getForm(idObject.f);

      if (!form || '_isRoot' in form) {
        return null;
      }

      return formToState(form);
    }
  } catch {
    console.error(brandMessage(`Failed to parse node id ${nodeId}`));
  }

  return null;
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

export function mapFormForDevtoolsInspector(form: DevtoolsForm, filter?: string): CustomInspectorNode {
  const { textColor, bgColor } = getValidityColors(form.isValid());
  const formState = formToState(form);

  const formTreeNodes = {};
  Array.from(form.fields?.values() ?? [])
    .filter(f => {
      if (!filter) {
        return true;
      }

      return f.getName()?.toLowerCase().includes(filter.toLowerCase()) ?? false;
    })
    .forEach(state => {
      setInPath(formTreeNodes, toValue(state.getPath() ?? ''), mapFieldForDevtoolsInspector(state, form));
    });

  const { children } = buildFormTree(formTreeNodes, [], form);

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
