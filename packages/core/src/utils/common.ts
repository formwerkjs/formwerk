import { computed, getCurrentScope, MaybeRefOrGetter, onScopeDispose, Ref, shallowRef, toValue, useId } from 'vue';
import { klona } from 'klona/full';
import { AriaDescriptionProps, Arrayable, Maybe, NormalizedProps } from '../types';
import { AsyncReturnType } from 'type-fest';

export function useUniqId(prefix?: string) {
  return prefix ? `${prefix}-${useId()}` : useId() || '';
}

export function createDescriptionProps(inputId: string): AriaDescriptionProps {
  return {
    id: `${inputId}-d`,
  };
}

export function createErrorProps(inputId: string) {
  return {
    id: `${inputId}-r`,
    'aria-live': 'polite',
    'aria-atomic': true,
  };
}

interface CreateDescribedByInit {
  inputId: string;
  description: MaybeRefOrGetter<string | undefined>;
}

export function createDescribedByProps({ inputId, description }: CreateDescribedByInit) {
  const descriptionRef = shallowRef<HTMLElement>();
  const descriptionProps = withRefCapture(createDescriptionProps(inputId), descriptionRef);

  const describedByProps = computed(() => {
    return {
      'aria-describedby': descriptionRef.value ? toValue(description) : undefined,
    };
  });

  return {
    describedByProps,
    descriptionProps,
  };
}

interface CreateAccessibleErrorMessageInit {
  inputId: string;
  errorMessage: MaybeRefOrGetter<string | undefined>;
}

export function createAccessibleErrorMessageProps({ inputId, errorMessage }: CreateAccessibleErrorMessageInit) {
  const errorMessageRef = shallowRef<HTMLElement>();
  const errorMessageProps = withRefCapture(createErrorProps(inputId), errorMessageRef);

  const accessibleErrorProps = computed(() => {
    const isInvalid = !!toValue(errorMessage);
    return {
      'aria-invalid': isInvalid,
      'aria-errormessage': isInvalid ? errorMessageProps.id : undefined,
    };
  });

  return {
    errorMessageProps,
    accessibleErrorProps,
  };
}

export function createRefCapture<TEl extends HTMLElement>(elRef: Ref<Maybe<TEl>>) {
  return function captureRef(el: HTMLElement) {
    elRef.value = el as TEl;
  };
}

function arrayToKeys<T extends string | number | symbol>(keys: T[]): Record<T, true> {
  const keyDict = keys.reduce(
    (acc, key) => {
      acc[key] = true;

      return acc;
    },
    {} as Record<T, true>,
  );

  return keyDict;
}

export function propsToValues<TProps extends Record<string, MaybeRefOrGetter<any>>>(
  props: TProps,
  keys: (keyof TProps)[],
) {
  const keyDict = arrayToKeys(keys);

  return Object.fromEntries(
    Object.entries(props)
      .filter(([key]) => keyDict[key])
      .map(([key, value]) => [key, toValue(value)]),
  );
}

export function normalizeProps<TProps extends Record<string, unknown>, Exclude extends keyof TProps = never>(
  props: TProps,
  exclude?: Exclude[],
): NormalizedProps<TProps, Exclude> {
  if ('__isFwNormalized__' in props) {
    return props as NormalizedProps<TProps, Exclude>;
  }

  const excludeDict = exclude ? arrayToKeys(exclude) : ({} as Record<string, true>);

  const normalized = Object.fromEntries(
    Object.keys(props).map(key => {
      // Existing getters are kept as is
      if (!excludeDict[key]) {
        return [key, () => toValue(props[key])];
      }

      if (isCallable(props[key])) {
        return [key, (...args: any[]) => (props[key] as any)(...args)];
      }

      return [key, props[key]];
    }),
  ) as NormalizedProps<TProps, Exclude>;

  normalized.__isFwNormalized__ = true;

  return normalized;
}

export function getNextCycleArrIdx(idx: number, arr: unknown[]): number {
  const r = idx % arr.length;

  return r < 0 ? r + arr.length : r;
}

/**
 * Injects a ref capture to the props object
 */
export function withRefCapture<TProps>(
  props: TProps,
  inputRef: Ref<Maybe<HTMLElement>>,
  elementRef?: Ref<Maybe<HTMLElement>>,
): TProps {
  if (!elementRef) {
    (props as any).ref = createRefCapture(inputRef);
  }

  return props;
}

export function isCallable(fn: unknown): fn is (...args: any[]) => any {
  return typeof fn === 'function';
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isEmpty(value: unknown): value is null | undefined | '' {
  return isNullOrUndefined(value) || value === '';
}

export const isSSR = typeof window === 'undefined';

export function normalizeArrayable<T>(value: Arrayable<T>): T[] {
  return Array.isArray(value) ? [...value] : [value];
}

/**
 * Clones a value deeply. I wish we could use `structuredClone` but it's not supported because of the deep Proxy usage by Vue.
 * I added some shortcuts here to avoid cloning some known types we don't plan to support.
 * https://github.com/lukeed/klona/tree/master/src
 */
export function cloneDeep<T>(value: T): T {
  if (value instanceof File || value instanceof RegExp || value instanceof Blob) {
    return value;
  }

  return klona(value);
}

export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise;
}

export function isFile(a: unknown): a is File {
  if (isSSR) {
    return false;
  }

  return a instanceof File;
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

  return a !== a && b !== b;
}

export function withLatestCall<
  TFunction extends (...args: any[]) => Promise<any>,
  TResult = AsyncReturnType<TFunction>,
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

export function batchAsync<TFunction extends (...args: any) => Promise<any>, TResult = AsyncReturnType<TFunction>>(
  inner: TFunction,
  ms = 0,
): (...args: Parameters<TFunction>) => Promise<TResult> {
  let timer: number | null = null;
  let resolves: any[] = [];

  return function (...args: Parameters<TFunction>) {
    // Run the function after a certain amount of time
    if (timer) {
      clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      // Get the result of the inner function, then apply it to the resolve function of
      // each promise that has been created since the last time the inner function was run
      const result = inner(...(args as any));

      resolves.forEach(r => r(result));
      resolves = [];
    }, ms);

    return new Promise<TResult>(resolve => resolves.push(resolve));
  };
}

export function warn(message: string) {
  if (__DEV__) {
    console.warn(`[Formwerk]: ${message}`);
  }
}

export function isInputElement(el: Maybe<HTMLElement>): el is HTMLInputElement {
  if (!el) {
    return false;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function toggleValueSelection<TValue>(current: Arrayable<TValue>, value: TValue, force?: boolean): TValue[] {
  const nextValue = normalizeArrayable(current);
  const idx = nextValue.findIndex(v => isEqual(v, value));
  const shouldAdd = force ?? idx === -1;

  if (!shouldAdd) {
    nextValue.splice(idx, 1);

    return nextValue;
  }

  // If it doesn't exist add it
  if (idx === -1) {
    nextValue.push(value);
  }

  return nextValue;
}

export function removeFirst<TItem>(items: TItem[], predicate: (item: TItem) => boolean) {
  const idx = items.findIndex(predicate);
  if (idx >= 0) {
    items.splice(idx, 1);
    return;
  }
}

/**
 * VueUse uses this to dispose of watchers/events in composable hooks.
 * https://vueuse.org/shared/tryOnScopeDispose/
 */
export function tryOnScopeDispose(fn: () => void) {
  if (getCurrentScope()) {
    onScopeDispose(fn);
    return true;
  }

  return false;
}
