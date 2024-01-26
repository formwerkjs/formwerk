import { InjectionKey, getCurrentInstance, inject } from 'vue';
import { isContainerValue, isNotNestedPath } from './assertions';
import { isObject } from 'util';
import { toNumber } from 'packages/shared';

/**
 * A typed version of Object.keys
 */
export function keysOf<TRecord extends Record<string, unknown>>(record: TRecord): (keyof TRecord)[] {
  return Object.keys(record);
}

type NestedRecord = Record<string, unknown> | { [k: string]: NestedRecord };

export function cleanupNonNestedPath(path: string) {
  if (isNotNestedPath(path)) {
    return path.replace(/\[|\]/gi, '');
  }

  return path;
}

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

  if (isNotNestedPath(path)) {
    return object[cleanupNonNestedPath(path)] as TValue | undefined;
  }

  const resolvedValue = (path || '')
    .split(/\.|\[(\d+)\]/)
    .filter(Boolean)
    .reduce((acc, propKey) => {
      if (isContainerValue(acc) && propKey in acc) {
        return acc[propKey];
      }

      return fallback;
    }, object as unknown);

  return resolvedValue as TValue | undefined;
}

// Uses same component provide as its own injections
// Due to changes in https://github.com/vuejs/vue-next/pull/2424
export function injectWithSelf<T>(symbol: InjectionKey<T>, def: T | undefined = undefined): T | undefined {
  const vm = getCurrentInstance() as any;

  return vm?.provides[symbol as any] || inject(symbol, def);
}

export function normalizeErrorItem(message: string | string[] | null | undefined) {
  return Array.isArray(message) ? message : message ? [message] : [];
}

export function withLatest<
  TFunction extends (...args: any[]) => Promise<any>,
  TResult = Awaited<ReturnType<TFunction>>,
>(fn: TFunction, onDone: (result: TResult, args: Parameters<TFunction>) => TResult) {
  let latestRun: Promise<TResult> | undefined;

  return async function runLatest(...args: Parameters<TFunction>) {
    const pending = fn(...args);
    latestRun = pending;
    const result = await pending;
    if (pending !== latestRun) {
      return result;
    }

    latestRun = undefined;

    return onDone(result, args);
  };
}

export function applyModelModifiers<TValue = unknown>(value: TValue, modifiers: unknown): TValue {
  if (!isObject(modifiers)) {
    return value;
  }

  if (modifiers.number) {
    return toNumber(value as string) as TValue;
  }

  return value;
}
