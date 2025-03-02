import { DateTimeSegmentType } from './types';
import type { DateTimeDuration, ZonedDateTime } from '@internationalized/date';

export function isEditableSegmentType(type: DateTimeSegmentType) {
  return !['era', 'timeZoneName', 'literal'].includes(type);
}

export function isOptionalSegmentType(type: DateTimeSegmentType) {
  const optionalTypes: DateTimeSegmentType[] = ['dayPeriod', 'weekday', 'era'];

  return optionalTypes.includes(type);
}

export function segmentTypeToDurationLike(type: DateTimeSegmentType): keyof DateTimeDuration | undefined {
  const map: Partial<Record<DateTimeSegmentType, keyof DateTimeDuration>> = {
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
    hour: '--',
    minute: '--',
    second: '--',
    dayPeriod: 'AM',
    weekday: 'ddd',
  };

  return map[type];
}

export function isNumericByDefault(type: DateTimeSegmentType) {
  const map: Partial<Record<DateTimeSegmentType, boolean>> = {
    year: true,
    month: true,
    day: true,
    hour: true,
    minute: true,
    second: true,
  };

  return map[type] ?? false;
}

type EditableSegmentType = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

export function getOrderedSegmentTypes(): EditableSegmentType[] {
  return ['year', 'month', 'day', 'hour', 'minute', 'second'];
}

export function isEqualPart(min: ZonedDateTime, max: ZonedDateTime, part: DateTimeSegmentType) {
  const editablePart = part as EditableSegmentType;
  const parts = getOrderedSegmentTypes();
  const idx = parts.indexOf(editablePart);
  if (idx === -1) {
    return false;
  }

  return parts.slice(0, idx).every(p => min[p] === max[p]) && min[editablePart] === max[editablePart];
}
