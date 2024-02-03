import { MaybeRefOrGetter, Ref, toValue } from 'vue';
import { AriaDescriptionProps } from '@core/types/common';

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

export function propsToValues<TProps extends Record<string, MaybeRefOrGetter<any>>>(
  props: TProps,
  keys: (keyof TProps)[],
) {
  const keyDict = keys.reduce(
    (acc, key) => {
      acc[key] = true;

      return acc;
    },
    {} as Record<keyof TProps, boolean>,
  );

  return Object.fromEntries(
    Object.entries(props)
      .filter(([key]) => keyDict[key])
      .map(([key, value]) => [key, toValue(value)]),
  );
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
