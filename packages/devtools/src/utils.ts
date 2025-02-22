import { CustomInspectorNode } from '@vue/devtools-kit';
import type { FormReturns } from '@core/index';
import { PathState } from './types';
import { isObject } from 'packages/shared/src/utils';
import { encodeNodeId } from './helpers';

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
