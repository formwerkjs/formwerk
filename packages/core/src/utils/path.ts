import { isIndex, isObject } from '../../../shared/src';
import { isNullOrUndefined } from './common';

export function isContainerValue(value: unknown): value is Record<string, unknown> {
  return isObject(value) || Array.isArray(value);
}

/**
 * True if the value is an empty object or array
 */
export function isEmptyContainer(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return isObject(value) && Object.keys(value).length === 0;
}

/**
 * Checks if the path opted out of nested fields using `[fieldName]` syntax
 */
export function isEscapedPath(path: string) {
  return /^\[.+\]$/i.test(path);
}

export function cleanupNonNestedPath(path: string) {
  if (isEscapedPath(path)) {
    return path.replace(/\[|\]/gi, '');
  }

  return path;
}

type NestedRecord = Record<string, unknown> | { [k: string]: NestedRecord };

/**
 * Gets a nested property value from an object
 */
export function getFromPath<TValue = unknown>(object: NestedRecord | undefined, path: string): TValue | undefined;
export function getFromPath<TValue = unknown, TFallback = TValue>(
  object: NestedRecord | undefined,
  path: string,
  fallback?: TFallback,
): TValue | TFallback;
export function getFromPath<TValue = unknown, TFallback = TValue>(
  object: NestedRecord | undefined,
  path: string,
  fallback?: TFallback,
): TValue | TFallback | undefined {
  if (!object) {
    return fallback;
  }

  if (isEscapedPath(path)) {
    return object[cleanupNonNestedPath(path)] as TValue | undefined;
  }

  const normalizedPath = normalizePath(path);
  const resolvedValue = (normalizedPath || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc, propKey) => {
      if (isContainerValue(acc) && propKey in acc) {
        return acc[propKey];
      }

      return fallback;
    }, object as unknown);

  return resolvedValue as TValue | undefined;
}

export function getLastReachableValue<TValue = unknown>(
  object: NestedRecord | undefined,
  path: string,
): TValue | undefined {
  if (!object) {
    return undefined;
  }

  if (isEscapedPath(path)) {
    return object[cleanupNonNestedPath(path)] as TValue | undefined;
  }

  const normalizedPath = normalizePath(path);
  let resolvedValue = object as unknown;

  for (const propKey of (normalizedPath || '').split('.').filter(Boolean)) {
    if (!isContainerValue(resolvedValue)) {
      return resolvedValue as TValue;
    }

    if (!(propKey in resolvedValue)) {
      return resolvedValue as TValue;
    }

    resolvedValue = resolvedValue[propKey];
  }

  return resolvedValue as TValue | undefined;
}

/**
 * Sets a nested property value in a path, creates the path properties if it doesn't exist
 */
export function setInPath(object: NestedRecord, path: string, value: unknown): void {
  if (isEscapedPath(path)) {
    object[cleanupNonNestedPath(path)] = value;
    return;
  }

  const normalizedPath = normalizePath(path);
  const keys = normalizedPath.split('.').filter(Boolean);
  let acc: Record<string, unknown> = object;
  for (let i = 0; i < keys.length; i++) {
    // Last key, set it
    if (i === keys.length - 1) {
      acc[keys[i]] = value;
      return;
    }

    // Key does not exist, create a container for it
    if (!(keys[i] in acc) || isNullOrUndefined(acc[keys[i]])) {
      // container can be either an object or an array depending on the next key if it exists
      acc[keys[i]] = isIndex(keys[i + 1]) ? [] : {};
    }

    acc = acc[keys[i]] as Record<string, unknown>;
  }
}

export function setTouchedInPath(object: NestedRecord, path: string, value: boolean): void {
  if (isEscapedPath(path)) {
    const cleanPath = cleanupNonNestedPath(path);

    // Set the main path
    object[cleanPath] = value;

    // Find and set all nested paths that start with this path
    for (const key in object) {
      if (key.startsWith(`${cleanPath}.`)) {
        object[key] = value;
      }
    }
    return;
  }

  const normalizedPath = normalizePath(path);
  const keys = normalizedPath.split('.').filter(Boolean);
  let acc: Record<string, unknown> = object;
  for (let i = 0; i < keys.length; i++) {
    // Last key, set it
    if (i === keys.length - 1) {
      const targetKey = keys[i];
      if (typeof acc[targetKey] === 'object' && acc[targetKey] !== null) {
        setAllChildrenToValue(acc[targetKey] as Record<string, unknown>, value);
      } else {
        acc[targetKey] = value;
      }
      return;
    }

    // Key does not exist, create a container for it
    if (!(keys[i] in acc) || isNullOrUndefined(acc[keys[i]])) {
      // container can be either an object or an array depending on the next key if it exists
      acc[keys[i]] = isIndex(keys[i + 1]) ? [] : {};
    }

    acc = acc[keys[i]] as Record<string, unknown>;
  }
}

function setAllChildrenToValue(obj: Record<string, unknown>, value: boolean): void {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      setAllChildrenToValue(obj[key] as Record<string, unknown>, value);
    } else {
      obj[key] = value;
    }
  }
}

function del(object: Record<string, unknown> | unknown[], key: string | number) {
  if (Array.isArray(object) && isIndex(key)) {
    object.splice(Number(key), 1);
    return;
  }

  if (isObject(object)) {
    delete object[key];
  }
}

function unset(object: Record<string, unknown> | unknown[], key: string | number) {
  if (Array.isArray(object) && isIndex(key)) {
    object[key] = undefined;
    return;
  }

  if (isObject(object)) {
    object[key] = undefined;
  }
}

/**
 * Removes a nested property from object
 */
export function unsetPath(object: NestedRecord, path: string, destroy?: boolean): void {
  if (isEscapedPath(path)) {
    delete object[cleanupNonNestedPath(path)];
    return;
  }

  const mut = destroy ? del : unset;

  const normalizedPath = normalizePath(path);
  const keys = normalizedPath.split('.').filter(Boolean);
  let acc: Record<string, unknown> = object;
  for (let i = 0; i < keys.length; i++) {
    // Last key, unset it
    if (i === keys.length - 1) {
      mut(acc, keys[i]);
      break;
    }

    // Key does not exist, exit
    if (!(keys[i] in acc) || isNullOrUndefined(acc[keys[i]])) {
      break;
    }

    acc = acc[keys[i]] as Record<string, unknown>;
  }

  const pathValues: (unknown | Record<string, unknown>)[] = keys.map((_, idx) => {
    return getFromPath(object, keys.slice(0, idx).join('.'));
  });

  for (let i = pathValues.length - 1; i >= 0; i--) {
    if (!isEmptyContainer(pathValues[i])) {
      continue;
    }

    if (i === 0) {
      mut(object, keys[0]);
      continue;
    }

    mut(pathValues[i - 1] as Record<string, unknown>, keys[i - 1]);
  }
}

const ABSENT_VALUE = Symbol('ABSENT_VALUE');

export function isPathSet(object: NestedRecord, path: string): boolean {
  return getFromPath(object, path, ABSENT_VALUE) !== ABSENT_VALUE;
}

export function escapePath(path: string) {
  return isEscapedPath(path) ? path : `[${path}]`;
}

export function findLeaf(
  object: NestedRecord,
  predicate: (value: unknown, path: string) => boolean,
  acc: string = '',
): string | undefined {
  const entries = Object.entries(object);
  const path = acc ? `${acc}.` : '';

  for (const [key, value] of entries) {
    if (isObject(value)) {
      const nested = findLeaf(value as NestedRecord, predicate, path);
      if (nested) {
        return `${path}${key}.${nested}`;
      }
    }

    const fullPath = `${path}${key}`;
    if (predicate(value, fullPath)) {
      return fullPath;
    }
  }
}

const ARRAY_INDICES_RE = /\[(\d+)]$/;

/**
 * Swaps out array brackets for dots in a path.
 */
export function normalizePath(path: string): string {
  const pathArr = path.split('.');
  if (!pathArr.length) {
    return '';
  }

  let fullPath = String(pathArr[0]);
  for (let i = 1; i < pathArr.length; i++) {
    if (ARRAY_INDICES_RE.test(pathArr[i])) {
      fullPath += `.${pathArr[i].replace(ARRAY_INDICES_RE, '.$1')}`;
      continue;
    }

    fullPath += `.${pathArr[i]}`;
  }

  return fullPath;
}

export function prefixPath(prefix: string | undefined, path: string | undefined) {
  if (!path) {
    return path;
  }

  prefix = prefix ? `${prefix}.` : '';

  return `${prefix}${path}`;
}
