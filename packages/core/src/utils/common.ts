import { MaybeRefOrGetter, Ref, toValue } from 'vue';
import { klona } from 'klona/full';
import { AriaDescriptionProps, Arrayable, NormalizedProps } from '../types';

export function uniqId() {
  return crypto.randomUUID();
}

// TODO: Make this a proper deep equality check
export function isEqual(lhs: unknown, rhs: unknown) {
  return lhs === rhs;
}

export function createDescriptionProps(inputId: string): AriaDescriptionProps {
  return {
    id: `${inputId}-d`,
  };
}

export function createErrorProps(inputId: string): AriaDescriptionProps {
  return {
    id: `${inputId}-r`,
  };
}

interface CreateDescribedByInit {
  inputId: string;
  errorMessage: MaybeRefOrGetter<string | undefined>;
  description: MaybeRefOrGetter<string | undefined>;
}

export function createDescribedByProps({ inputId, errorMessage, description }: CreateDescribedByInit) {
  const errorMessageProps = createErrorProps(inputId);
  const descriptionProps = createDescriptionProps(inputId);

  const describedBy = () => {
    return toValue(errorMessage) ? errorMessageProps.id : toValue(description) ? descriptionProps.id : undefined;
  };

  return {
    describedBy,
    errorMessageProps,
    descriptionProps,
  };
}

export function createRefCapture<TEl extends HTMLElement>(elRef: Ref<TEl | undefined>) {
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
  const excludeDict = exclude ? arrayToKeys(exclude) : ({} as Record<string, true>);

  return Object.fromEntries(
    Object.keys(props).map(key => {
      // Existing getters are kept as is
      if (!excludeDict[key]) {
        return [key, () => toValue(props[key])];
      }

      if (isCallable(props[key])) {
        return [key, (...args: any[]) => (props[key] as any)(...args)];
      }

      return [key, () => props[key]];
    }),
  ) as NormalizedProps<TProps, Exclude>;
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
  inputRef: Ref<HTMLElement | undefined>,
  elementRef?: Ref<HTMLElement | undefined>,
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
  return Array.isArray(value) ? value : [value];
}

export const isObject = (obj: unknown): obj is Record<string, unknown> =>
  obj !== null && !!obj && typeof obj === 'object' && !Array.isArray(obj);

export function isIndex(value: unknown): value is number {
  return Number(value) >= 0;
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

export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise;
}
