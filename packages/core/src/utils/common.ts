import {
  ComponentPublicInstance,
  computed,
  getCurrentScope,
  MaybeRefOrGetter,
  onScopeDispose,
  Ref,
  toValue,
  useId,
} from 'vue';
import { klona } from 'klona/full';
import {
  Arrayable,
  DangerousAny,
  IssueCollection,
  Maybe,
  NormalizedProps,
  Numberish,
  Reactivify,
  StandardIssue,
} from '../types';
import { AsyncReturnType } from 'type-fest';
import { getDotPath } from '@standard-schema/utils';
import { isObject } from '../../../shared/src/utils';

export const isSSR = typeof window === 'undefined';

export function useUniqId(prefix?: string) {
  return prefix ? `${prefix}-${useId()}` : useId() || '';
}

export function createRefCapture<TEl extends HTMLElement>(elRef: Ref<Maybe<TEl>>) {
  return (el: HTMLElement) => {
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

export function propsToValues<TProps extends Record<string, MaybeRefOrGetter<unknown>>>(
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

export function normalizeProps<TProps extends object, Exclude extends keyof TProps = never>(
  props: Reactivify<TProps, Exclude>,
  exclude?: Exclude[],
): NormalizedProps<TProps, Exclude> {
  if ('__isFwNormalized__' in props) {
    return props as NormalizedProps<TProps, Exclude>;
  }

  const excludeDict = exclude ? arrayToKeys(exclude) : ({} as Record<string, true>);

  const normalized = Object.fromEntries(
    Object.keys(props).map(key => {
      const k = key as keyof TProps;
      // Existing getters are kept as is
      if (!excludeDict[key]) {
        return [key, () => toValue(props[k])];
      }

      if (isCallable(props[k])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return [key, (...args: any[]) => (props[k] as any)(...args)];
      }

      return [key, props[k]];
    }),
  ) as NormalizedProps<TProps, Exclude>;

  normalized.__isFwNormalized__ = true;

  return normalized;
}

export function getNextCycleArrIdx(idx: number, arr: unknown[]): number {
  const r = idx % arr.length;

  return r < 0 ? r + arr.length : r;
}

export function useCaptureProps<TProps>(props: () => TProps, inputEl: Ref<Maybe<HTMLElement>>) {
  function captureFn(el: HTMLElement) {
    if (el) {
      inputEl.value = el;
    }
  }

  return computed(() => {
    if (inputEl.value) {
      return props();
    }

    const ps = props() as Record<string, unknown>;
    ps.ref = captureFn;

    return ps as TProps;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCallable(fn: unknown): fn is (...args: any[]) => any {
  return typeof fn === 'function';
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isEmpty(value: unknown): value is null | undefined | '' {
  return isNullOrUndefined(value) || value === '';
}

export function normalizeArrayable<T>(value: Arrayable<T>): T[] {
  return Array.isArray(value) ? [...value] : [value];
}

/**
 * Clones a value deeply. I wish we could use `structuredClone` but it's not supported because of the deep Proxy usage by Vue.
 * I added some shortcuts here to avoid cloning some known types we don't plan to support.
 * https://github.com/lukeed/klona/tree/master/src
 */
export function cloneDeep<T>(value: T): T {
  if (isFileOrBlob(value) || value instanceof RegExp) {
    return value;
  }

  return klona(value);
}

export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise;
}

export function isFileOrBlob(a: unknown): a is File | Blob {
  if (isSSR) {
    return false;
  }

  return a instanceof File || a instanceof Blob;
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
 **/
export function isEqual(a: DangerousAny, b: DangerousAny) {
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
      length = (a as DangerousAny).length;

      if (length != (b as DangerousAny).length) return false;
      for (i = length; i-- !== 0; ) if ((a as DangerousAny)[i] !== (b as DangerousAny)[i]) return false;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export function batchAsync<
  TFunction extends (...args: unknown[]) => Promise<unknown>,
  TResult = AsyncReturnType<TFunction>,
>(inner: TFunction, ms = 0): (...args: Parameters<TFunction>) => Promise<TResult> {
  let timer: number | null = null;
  let resolves: ((value: TResult | Promise<TResult>) => void)[] = [];

  return function (...args: Parameters<TFunction>) {
    // Run the function after a certain amount of time
    if (timer) {
      clearTimeout(timer);
    }

    timer = window.setTimeout(() => {
      // Get the result of the inner function, then apply it to the resolve function of
      // each promise that has been created since the last time the inner function was run
      const result = inner(...args);

      resolves.forEach(r => r(result as TResult));
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

  return isComponent(el) || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/**
 * Checks if an element is labelable.
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories#labelable
 */
export function isLabelableElement(el: Maybe<HTMLElement | ComponentPublicInstance>): boolean {
  return (
    isComponent(el) ||
    isInputElement(el) ||
    isButtonElement(el) ||
    ['METER', 'OUTPUT', 'PROGRESS'].includes(el?.tagName ?? '')
  );
}

export function isLabelElement(el: Maybe<HTMLElement | ComponentPublicInstance>): el is HTMLLabelElement {
  if (!el) {
    return false;
  }

  return isComponent(el) || el?.tagName === 'LABEL';
}

export function isComponent(ref: Maybe<HTMLElement | ComponentPublicInstance>): ref is ComponentPublicInstance {
  if (!ref || 'tagName' in ref) {
    return false;
  }

  return '$' in ref;
}

export function isButtonElement(el: Maybe<HTMLElement | ComponentPublicInstance>): el is HTMLButtonElement {
  return isComponent(el) || el?.tagName === 'BUTTON';
}

export function isFormElement(el: Maybe<HTMLElement>): el is HTMLFormElement {
  return el?.tagName === 'FORM';
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

export function hasKeyCode(e: Event, code: string) {
  return (e as KeyboardEvent).code === code || (e as KeyboardEvent).key === code;
}

function _combineIssueItems<TItem extends StandardIssue | IssueCollection>(
  items: TItem[] | readonly TItem[],
  getPath: (item: TItem) => string,
) {
  const issueMap: Record<string, IssueCollection> = {};
  for (const item of items) {
    const path = getPath(item);
    if (!issueMap[path]) {
      issueMap[path] = {
        path,
        messages: [],
      };
    }

    if ('messages' in item) {
      issueMap[path].messages.push(...item.messages);
    } else {
      issueMap[path].messages.push(item.message);
    }
  }

  return Object.values(issueMap);
}

/**
 * Aggregates standard schema issues by path.
 */
export function combineStandardIssues(issues: StandardIssue[] | readonly StandardIssue[]): IssueCollection[] {
  return _combineIssueItems(issues, issue => (issue.path ? (getDotPath(issue) ?? '') : ''));
}

/**
 * Aggregates formwerk's issues by path.
 */
export function combineIssues(issues: IssueCollection[]): IssueCollection[] {
  return _combineIssueItems(issues, issue => issue.path ?? '');
}

export function fromNumberish(value: MaybeRefOrGetter<Numberish | undefined>): number | undefined {
  const innerVal = toValue(value);
  if (isNullOrUndefined(innerVal)) {
    return undefined;
  }

  const num = Number(innerVal);

  return Number.isNaN(num) ? undefined : num;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<TFunction extends (...args: any[]) => any>(ms: number, fn: TFunction) {
  if (ms <= 0) {
    return fn;
  }

  let timer: number | null = null;

  return function (...args: Parameters<TFunction>) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = window.setTimeout(() => fn(...args), ms);
  };
}

/**
 * Checks if an element is in the viewport of another element.
 */
export function isInViewport(el: Maybe<HTMLElement>, reference: Maybe<HTMLElement>) {
  if (!el || !reference) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  const referenceRect = reference.getBoundingClientRect();

  return rect.top >= referenceRect.top && rect.bottom <= referenceRect.bottom;
}

export type LowPriority<TValue> = {
  __isFwLowPriority__: true;
  value: TValue;
};

export function lowPriority<TValue>(value: TValue) {
  return {
    __isFwLowPriority__: true,
    value,
  };
}

export function isLowPriority<TValue = unknown>(value: unknown): value is LowPriority<TValue> {
  return isObject(value) && '__isFwLowPriority__' in value;
}

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export function toPrimitiveBooleanValue(val: MaybeRefOrGetter<Boolean | undefined>): boolean | undefined {
  const unwrapped = toValue(val);

  if (typeof unwrapped === 'string' && unwrapped === '') {
    return true;
  }
  return unwrapped?.valueOf();
}
