import { Temporal } from '@js-temporal/polyfill';
import { DateTimeSegmentType, TemporalPartial } from './types';
import { CalendarIdentifier } from '../useCalendar';
import { isObject } from '../../../shared/src';

export function createTemporalPartial(calendar: CalendarIdentifier, timeZone: string) {
  const zonedDateTime = Temporal.Now.zonedDateTime(calendar, timeZone);
  zonedDateTime['~fw_temporal_partial'] = {};

  return zonedDateTime as TemporalPartial;
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

export function isTemporalPartial(value: Temporal.ZonedDateTime): value is TemporalPartial {
  return isObject(value['~fw_temporal_partial']);
}

export function isTemporalPartSet(value: TemporalPartial, part: DateTimeSegmentType): boolean {
  return part in value['~fw_temporal_partial'] && value['~fw_temporal_partial'][part] === true;
}
