import { OtpSlotAcceptType } from './types';

const acceptMapRegex: Record<OtpSlotAcceptType, RegExp> = {
  all: /./,
  numeric: /^\d+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
};

export function isValueAccepted(value: string, accept: OtpSlotAcceptType) {
  const regex = acceptMapRegex[accept];

  return regex.test(value);
}
