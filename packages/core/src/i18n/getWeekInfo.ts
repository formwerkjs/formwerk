import { isCallable, warn } from '../utils/common';

export interface WeekInfo {
  firstDay: number;
  weekend: number[];
}

export function getWeekInfo(locale: Intl.Locale): WeekInfo {
  const fallbackInfo: WeekInfo = { firstDay: 7, weekend: [6, 7] };

  try {
    if ('weekInfo' in locale) {
      return (locale.weekInfo as WeekInfo) || fallbackInfo;
    }

    if ('getWeekInfo' in locale && isCallable(locale.getWeekInfo)) {
      return (locale.getWeekInfo() as WeekInfo) || fallbackInfo;
    }

    throw new Error(`Cannot determine week info for locale ${locale}`);
  } catch {
    warn(`Cannot determine week info for locale ${locale}`);

    return fallbackInfo;
  }
}
