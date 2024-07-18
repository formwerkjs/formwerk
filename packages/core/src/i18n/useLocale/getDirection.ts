import { Direction } from '../../types';
import { isCallable } from '../../utils/common';

export function getDirection(locale: string): Direction {
  try {
    const instance = new Intl.Locale(locale);
    if ('textInfo' in instance) {
      return ((instance.textInfo as any).direction as Direction) || 'ltr';
    }

    if ('getTextInfo' in instance && isCallable(instance.getTextInfo)) {
      return (instance.getTextInfo().direction as Direction) || 'ltr';
    }

    throw new Error(`Cannot determine direction for locale ${locale}`);
  } catch (err) {
    // TODO: WARN

    return 'ltr';
  }
}
