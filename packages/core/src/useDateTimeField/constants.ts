import { Temporal } from '@js-temporal/polyfill';
import { DateTimeSegmentType } from './types';

export function isEditableSegmentType(type: DateTimeSegmentType) {
  return !['era', 'timeZoneName', 'literal'].includes(type);
}

export function segmentTypeToDurationLike(type: DateTimeSegmentType): keyof Temporal.DurationLike | undefined {
  const map: Partial<Record<DateTimeSegmentType, keyof Temporal.DurationLike>> = {
    year: 'years',
    month: 'months',
    day: 'days',
    hour: 'hours',
    minute: 'minutes',
    second: 'seconds',
    dayPeriod: 'hours',
  };

  return map[type];
}
