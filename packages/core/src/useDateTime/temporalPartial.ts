import { DateTimeSegmentType, TemporalPartial } from './types';
import { isObject } from '../../../shared/src';
import { Maybe } from '../types';
import { getOrderedSegmentTypes, isEqualPart } from './constants';
import { Temporal } from 'temporal-polyfill';

export function createTemporalPartial(
  calendar: string,
  timeZone: string,
  min?: Maybe<Temporal.ZonedDateTime>,
  max?: Maybe<Temporal.ZonedDateTime>,
) {
  if (min && max) {
    // Get the middle of the min and max
    const diff = Math.round(max.since(min, { largestUnit: 'milliseconds' }).milliseconds / 2);
    const zonedDateTime = min
      .add({
        milliseconds: diff,
      })
      .with({
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

  const zonedDateTime = Temporal.Now.zonedDateTimeISO(timeZone).withCalendar(calendar).with({
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  }) as TemporalPartial;
  zonedDateTime['~fw_temporal_partial'] = {};

  return zonedDateTime;
}

export function toTemporalPartial(
  value: Temporal.ZonedDateTime | TemporalPartial,
  setParts?: DateTimeSegmentType[],
): TemporalPartial {
  const clone = Temporal.ZonedDateTime.from(value);
  clone['~fw_temporal_partial'] = isTemporalPartial(value) ? value['~fw_temporal_partial'] : {};
  if (setParts) {
    setParts.forEach(part => {
      clone['~fw_temporal_partial'][part] = true;
    });
  }

  return clone as TemporalPartial;
}

export function isTemporalPartial(value: Temporal.ZonedDateTime | TemporalPartial): value is TemporalPartial {
  return isObject((value as TemporalPartial)['~fw_temporal_partial']);
}

export function isTemporalPartSet(value: TemporalPartial, part: DateTimeSegmentType): boolean {
  return part in value['~fw_temporal_partial'] && value['~fw_temporal_partial'][part] === true;
}
