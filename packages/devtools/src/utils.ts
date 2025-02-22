import { CustomInspectorNode } from '@vue/devtools-kit';
import { PathState } from './types';
import { isObject } from 'packages/shared/src/utils';

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

export function buildFormTree(tree: any[] | Record<string, any>, path: string[] = []): CustomInspectorNode {
  const key = [...path].pop();
  if ('id' in tree) {
    return {
      ...tree,
      label: key || tree.label,
    } as CustomInspectorNode;
  }

  if (isObject(tree)) {
    return {
      id: `${path.join('.')}`,
      label: key || '',
      children: Object.keys(tree).map(key => buildFormTree(tree[key] as any, [...path, key])),
    };
  }

  if (Array.isArray(tree)) {
    return {
      id: `${path.join('.')}`,
      label: `${key}[]`,
      children: tree.map((c, idx) => buildFormTree(c, [...path, String(idx)])),
    };
  }

  return { id: '', label: '', children: [] };
}

export function brandMessage(message: string) {
  return `[Formwerk Devtools]: ${message}`;
}
