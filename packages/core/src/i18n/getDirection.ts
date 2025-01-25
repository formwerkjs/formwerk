import { Direction } from '../types';
import { isCallable, warn } from '../utils/common';
import { getConfig } from '../config';

export function getDirection(locale: Intl.Locale): Direction {
  if (!getConfig().detectDirection) {
    return 'ltr';
  }

  try {
    if ('textInfo' in locale) {
      return ((locale.textInfo as { direction: Direction }).direction as Direction) || 'ltr';
    }

    if ('getTextInfo' in locale && isCallable(locale.getTextInfo)) {
      return (locale.getTextInfo().direction as Direction) || 'ltr';
    }

    throw new Error(`Cannot determine direction for locale ${locale}`);
  } catch {
    warn(`Cannot determine direction for locale ${locale}, defaulting to LTR`);

    return 'ltr';
  }
}
