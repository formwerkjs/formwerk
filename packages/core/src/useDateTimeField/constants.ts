import { Temporal } from '@js-temporal/polyfill';
import { DateTimeSegmentType } from './types';

export function isEditableSegmentType(type: DateTimeSegmentType) {
  return !['era', 'timeZoneName', 'literal'].includes(type);
}

export function isOptionalSegmentType(type: DateTimeSegmentType) {
  const optionalTypes: DateTimeSegmentType[] = ['dayPeriod', 'weekday', 'era'];

  return optionalTypes.includes(type);
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
    weekday: 'days',
  };

  return map[type];
}

export function getSegmentTypePlaceholder(type: DateTimeSegmentType) {
  const map: Partial<Record<DateTimeSegmentType, string>> = {
    year: 'YYYY',
    month: 'MM',
    day: 'DD',
    hour: 'HH',
    minute: 'mm',
    second: 'ss',
    dayPeriod: 'AM',
    weekday: 'ddd',
  };

  return map[type];
}
