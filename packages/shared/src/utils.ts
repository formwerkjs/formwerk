export function isObjectLike(value: unknown) {
  return typeof value === 'object' && value !== null;
}

export function getTag(value: unknown) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]';
  }
  return Object.prototype.toString.call(value);
}

// Reference: https://github.com/lodash/lodash/blob/master/isPlainObject.js
export function isPlainObject(value: unknown) {
  if (!isObjectLike(value) || getTag(value) !== '[object Object]') {
    return false;
  }
  if (Object.getPrototypeOf(value) === null) {
    return true;
  }
  let proto = value;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(value) === proto;
}

export function merge(target: any, source: any) {
  Object.keys(source).forEach(key => {
    if (isPlainObject(source[key]) && isPlainObject(target[key])) {
      if (!target[key]) {
        target[key] = {};
      }

      merge(target[key], source[key]);
      return;
    }

    target[key] = source[key];
  });

  return target;
}

export function isIndex(value: unknown): value is number {
  return Number(value) >= 0;
}

export const isObject = (obj: unknown): obj is Record<string, unknown> =>
  obj !== null && !!obj && typeof obj === 'object' && !Array.isArray(obj);
