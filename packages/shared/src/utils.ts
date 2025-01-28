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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// https://github.com/bameyrick/throttle-typescript
type ThrottledFunction<T extends (...args: any) => any> = (...args: Parameters<T>) => ReturnType<T>;

/**
 * Creates a throttled function that only invokes the provided function (`func`) at most once per within a given number of milliseconds
 * (`limit`)
 */
export function throttle<T extends (...args: any) => any>(func: T, limit: number): ThrottledFunction<T> {
  let inThrottle: boolean;
  let lastResult: ReturnType<T>;

  return function (this: any, ...args: any[]): ReturnType<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this;

    if (!inThrottle) {
      inThrottle = true;

      setTimeout(() => (inThrottle = false), limit);

      lastResult = func.apply(context, args);
    }

    return lastResult;
  };
}
