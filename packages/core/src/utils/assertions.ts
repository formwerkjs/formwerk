import { isCallable, isObject } from 'packages/shared';
import { TypedSchema, YupSchema } from '../types/forms';

export function isTypedSchema(value: unknown): value is TypedSchema {
  return !!value && isCallable((value as TypedSchema).parse) && (value as TypedSchema).__type === 'VVTypedSchema';
}

export function isYupValidator(value: unknown): value is YupSchema {
  return !!value && isCallable((value as YupSchema).validate);
}

/**
 * Checks if the path opted out of nested fields using `[fieldName]` syntax
 */
export function isNotNestedPath(path: string) {
  return /^\[.+\]$/i.test(path);
}

export const isClient = typeof window !== 'undefined';

export function isContainerValue(value: unknown): value is Record<string, unknown> {
  return isObject(value) || Array.isArray(value);
}
/**
 * Compares if two values are the same borrowed from:
 * https://github.com/epoberezkin/fast-deep-equal
 * We added a case for file matching since `Object.keys` doesn't work with Files.
 * */
export function isEqual(a: any, b: any) {
  if (a === b) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.constructor !== b.constructor) return false;

    // eslint-disable-next-line no-var
    var length, i, keys;
    if (Array.isArray(a)) {
      length = a.length;
      // eslint-disable-next-line eqeqeq
      if (length != b.length) return false;
      for (i = length; i-- !== 0; ) if (!isEqual(a[i], b[i])) return false;
      return true;
    }

    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (i of a.entries()) if (!b.has(i[0])) return false;
      for (i of a.entries()) if (!isEqual(i[1], b.get(i[0]))) return false;
      return true;
    }

    // We added this part for file comparison, arguably a little naive but should work for most cases.
    // #3911
    if (isFile(a) && isFile(b)) {
      if (a.size !== b.size) return false;
      if (a.name !== b.name) return false;
      if (a.lastModified !== b.lastModified) return false;
      if (a.type !== b.type) return false;

      return true;
    }

    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (i of a.entries()) if (!b.has(i[0])) return false;
      return true;
    }

    if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
      length = (a as any).length;
      // eslint-disable-next-line eqeqeq
      if (length != (b as any).length) return false;
      for (i = length; i-- !== 0; ) if ((a as any)[i] !== (b as any)[i]) return false;
      return true;
    }

    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

    keys = Object.keys(a);
    length = keys.length;

    for (i = length; i-- !== 0; ) {
      // eslint-disable-next-line no-var
      var key = keys[i];

      if (!isEqual(a[key], b[key])) return false;
    }

    return true;
  }

  // true if both NaN, false otherwise
  // eslint-disable-next-line no-self-compare
  return a !== a && b !== b;
}

export function isFile(a: unknown): a is File {
  if (!isClient) {
    return false;
  }

  return a instanceof File;
}

export function hasCheckedAttr(type: unknown) {
  return type === 'checkbox' || type === 'radio';
}

/**
 * Checks if an element is a native HTML5 multi-select input element
 */
export function isNativeMultiSelect(el: HTMLElement): el is HTMLSelectElement {
  return isNativeSelect(el) && el.multiple;
}

/**
 * Checks if an element is a native HTML5 select input element
 */
export function isNativeSelect(el: HTMLElement): el is HTMLSelectElement {
  return el.tagName === 'SELECT';
}

export function isEvent(evt: unknown): evt is Event {
  if (!evt) {
    return false;
  }

  if (typeof Event !== 'undefined' && isCallable(Event) && evt instanceof Event) {
    return true;
  }

  // this is for IE and Cypress #3161
  /* istanbul ignore next */
  if (evt && (evt as Event).srcElement) {
    return true;
  }

  return false;
}
