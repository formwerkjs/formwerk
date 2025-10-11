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
import { setInPath } from '../../../packages/core/src/utils/path';
import { getField, getForm } from './registry';
import type { FormReturns } from '@core/index';
import { isObject } from '../../../packages/shared/src/utils';

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
        key: 'blurred',
        value: state.blurred,
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
        key: 'blurred',
        value: form.blurred,
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
        key: 'issues',
        value: form.issues,
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
        blurred: form.isBlurred(idObject.fp),
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
      label: toValue(field.type),
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

/**
 * A typed version of Object.keys
 */
export function keysOf<TRecord extends Record<string, unknown>>(record: TRecord): (keyof TRecord)[] {
  return Object.keys(record);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPathState(value: any): value is PathState {
  return value && 'path' in value && 'value' in value;
}

export function buildFormTree(
  tree: any[] | Record<string, any>,
  path: string[] = [],
  form: FormReturns,
): CustomInspectorNode {
  const key = [...path].pop();
  if ('id' in tree) {
    return {
      ...tree,
      label: key || tree.label,
    } as CustomInspectorNode;
  }

  const fullPath = path.join('.');

  const nodeState: PathState = {
    formId: form.context.id,
    dirty: form.isDirty(fullPath),
    blurred: form.isBlurred(fullPath),
    valid: form.isValid(fullPath),
    errors: form.getErrors(fullPath),
    value: form.getValue(fullPath),
    touched: form.isTouched(fullPath),
    type: 'path',
    path: fullPath,
  };

  if (isObject(tree)) {
    return {
      id: encodeNodeId(nodeState),
      label: key || '',
      children: Object.keys(tree).map(key => buildFormTree(tree[key] as any, [...path, key], form)),
    };
  }

  if (Array.isArray(tree)) {
    return {
      id: encodeNodeId(nodeState),
      label: `${key}[]`,
      children: tree.map((c, idx) => buildFormTree(c, [...path, String(idx)], form)),
    };
  }

  return { id: '', label: '', children: [] };
}

export function brandMessage(message: string) {
  return `[Formwerk Devtools]: ${message}`;
}
