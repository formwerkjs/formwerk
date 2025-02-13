import { DateTimeSegmentType, TemporalPartial } from './types';
import { isObject } from '../../../shared/src';
import { Calendar, ZonedDateTime, fromDate, now } from '@internationalized/date';

export function createTemporalPartial(calendar: Calendar, timeZone: string) {
  const zonedDateTime = now(timeZone) as TemporalPartial;
  zonedDateTime['~fw_temporal_partial'] = {};

  return zonedDateTime;
}

export function toTemporalPartial(
  value: ZonedDateTime | TemporalPartial,
  setParts?: DateTimeSegmentType[],
): TemporalPartial {
  const clone = fromDate(value.toDate(), value.timeZone) as TemporalPartial;
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
