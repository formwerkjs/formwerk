import { DateTimeSegmentType, TemporalPartial } from './types';
import { isObject } from '../../../shared/src';
import { Calendar, ZonedDateTime, now, toCalendar } from '@internationalized/date';
import { Maybe } from '../types';
import { getOrderedSegmentTypes, isEqualPart } from './constants';

export function createTemporalPartial(
  calendar: Calendar,
  timeZone: string,
  min?: Maybe<ZonedDateTime>,
  max?: Maybe<ZonedDateTime>,
) {
  if (min && max) {
    // Get the middle of the min and max
    const diff = Math.round(max.compare(min) / 2);
    const zonedDateTime = min
      .add({
        milliseconds: diff,
      })
      .set({
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      }) as TemporalPartial;
    zonedDateTime['~fw_temporal_partial'] = {};

    const parts = getOrderedSegmentTypes();
    // If min and max parts are the same, then all parts are set, but we have to check previous parts for every part.
    parts.forEach(part => {
      zonedDateTime['~fw_temporal_partial'][part] = isEqualPart(min, max, part);
    });

    return zonedDateTime;
  }

  const zonedDateTime = toCalendar(now(timeZone), calendar).set({
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  }) as TemporalPartial;
  zonedDateTime['~fw_temporal_partial'] = {};

  return zonedDateTime;
}

export function toTemporalPartial(
  value: ZonedDateTime | TemporalPartial,
  setParts?: DateTimeSegmentType[],
): TemporalPartial {
  const clone = value.copy() as TemporalPartial;
  clone['~fw_temporal_partial'] = isTemporalPartial(value) ? value['~fw_temporal_partial'] : {};
  if (setParts) {
    setParts.forEach(part => {
      clone['~fw_temporal_partial'][part] = true;
    });
  }

  return clone as TemporalPartial;
}

export function isTemporalPartial(value: ZonedDateTime): value is TemporalPartial {
  return isObject((value as TemporalPartial)['~fw_temporal_partial']);
}

export function isTemporalPartSet(value: TemporalPartial, part: DateTimeSegmentType): boolean {
  return part in value['~fw_temporal_partial'] && value['~fw_temporal_partial'][part] === true;
}
