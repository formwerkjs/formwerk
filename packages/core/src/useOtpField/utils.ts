import { MaybeRefOrGetter, toValue } from 'vue';
import { OtpSlotAcceptType } from './types';
import { NormalizedProps } from '../types';
import { OtpControlProps } from './useOtpControl';

const acceptMapRegex: Record<OtpSlotAcceptType, RegExp> = {
  all: /./,
  numeric: /^\d+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
};

export function isValueAccepted(value: string, accept: OtpSlotAcceptType) {
  const regex = acceptMapRegex[accept];

  return regex.test(value);
}

export const DEFAULT_MASK = '•';

/**
 * Adds a prefix to a value if it is not already present.
 * @param value - The value to add the prefix to.
 * @param getPrefix - The prefix to add to the value.
 * @returns The value with the prefix added if it is not already present.
 */
export function withPrefix(value: string | undefined, getPrefix: MaybeRefOrGetter<string | undefined> | undefined) {
  const prefix = toValue(getPrefix);
  if (!prefix) {
    return value ?? '';
  }

  value = value ?? '';
  if (value.startsWith(prefix)) {
    return value;
  }

  return `${prefix}${value}`;
}

export function getOtpValue(props: NormalizedProps<OtpControlProps, 'schema' | 'onCompleted' | '_field'>) {
  return () => withPrefix(toValue(props.modelValue) ?? toValue(props.value), props.prefix);
}
