import { Temporal } from 'temporal-polyfill';
import { createTemporalPartial, isTemporalPartial, isTemporalPartSet, toTemporalPartial } from './temporalPartial';
import { DateTimeSegmentType } from './types';

describe('Temporal Partial', () => {
  describe('createTemporalPartial', () => {
    test('creates a temporal partial with empty set parts', () => {
      const calendar = 'gregory';
      const partial = createTemporalPartial(calendar, 'UTC');

      expect(partial['~fw_temporal_partial']).toEqual({});
      expect(isTemporalPartial(partial)).toBe(true);
    });

    test('creates temporal partial with different calendar systems', () => {
      const islamicCalendar = 'islamic-umalqura';
      const partial = createTemporalPartial(islamicCalendar, 'UTC');

      expect(partial.calendarId).toBe('islamic-umalqura');
      expect(isTemporalPartial(partial)).toBe(true);
    });
  });

  describe('toTemporalPartial', () => {
    test('converts ZonedDateTime to temporal partial', () => {
      const date = Temporal.Now.zonedDateTimeISO('UTC');
      const partial = toTemporalPartial(date);

      expect(isTemporalPartial(partial)).toBe(true);
      expect(partial['~fw_temporal_partial']).toEqual({});
    });

    test('clones existing temporal partial', () => {
      const date = Temporal.Now.zonedDateTimeISO('UTC');
      const partial1 = toTemporalPartial(date, ['day']);
      const partial2 = toTemporalPartial(partial1);

      expect(partial2['~fw_temporal_partial']).toEqual(partial1['~fw_temporal_partial']);
      expect(partial2).not.toBe(partial1); // Should be a new instance
    });

    test('sets specified parts as true', () => {
      const date = Temporal.Now.zonedDateTimeISO('UTC');
      const parts: DateTimeSegmentType[] = ['year', 'month', 'day'];
      const partial = toTemporalPartial(date, parts);

      parts.forEach(part => {
        expect(partial['~fw_temporal_partial'][part]).toBe(true);
      });
    });

    test('preserves existing set parts when adding new ones', () => {
      const date = Temporal.Now.zonedDateTimeISO('UTC');
      const partial1 = toTemporalPartial(date, ['year']);
      const partial2 = toTemporalPartial(partial1, ['month']);

      expect(partial2['~fw_temporal_partial']).toEqual({
        year: true,
        month: true,
      });
    });
  });

  describe('isTemporalPartial', () => {
    test('returns true for temporal partials', () => {
      const calendar = 'gregory';
      const partial = createTemporalPartial(calendar, 'UTC');

      expect(isTemporalPartial(partial)).toBe(true);
    });

    test('returns false for regular ZonedDateTime', () => {
      const date = Temporal.Now.zonedDateTimeISO('UTC');

      expect(isTemporalPartial(date)).toBe(false);
    });
  });

  describe('isTemporalPartSet', () => {
    test('returns true for set parts', () => {
      const date = Temporal.Now.zonedDateTimeISO('UTC');
      const partial = toTemporalPartial(date, ['year', 'month']);

      expect(isTemporalPartSet(partial, 'year')).toBe(true);
      expect(isTemporalPartSet(partial, 'month')).toBe(true);
    });

    test('returns false for unset parts', () => {
      const date = Temporal.Now.zonedDateTimeISO('UTC');
      const partial = toTemporalPartial(date, ['year']);

      expect(isTemporalPartSet(partial, 'month')).toBe(false);
      expect(isTemporalPartSet(partial, 'day')).toBe(false);
    });

    test('handles multiple operations on the same partial', () => {
      const date = Temporal.Now.zonedDateTimeISO('UTC');
      let partial = toTemporalPartial(date, ['year']);
      partial = toTemporalPartial(partial, ['month']);
      partial = toTemporalPartial(partial, ['day']);

      expect(isTemporalPartSet(partial, 'year')).toBe(true);
      expect(isTemporalPartSet(partial, 'month')).toBe(true);
      expect(isTemporalPartSet(partial, 'day')).toBe(true);
      expect(isTemporalPartSet(partial, 'hour')).toBe(false);
    });
  });

  test('temporal partial maintains date values', () => {
    const date = Temporal.Now.zonedDateTimeISO('UTC');
    const partial = toTemporalPartial(date, ['year', 'month', 'day']);

    expect(partial.year).toBe(date.year);
    expect(partial.month).toBe(date.month);
    expect(partial.day).toBe(date.day);
  });
});
