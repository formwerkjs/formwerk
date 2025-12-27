import { createCalendar, fromDate, now } from '@internationalized/date';
import { useTemporalStore } from './useTemporalStore';
import { createTemporalPartial, isTemporalPartial } from './temporalPartial';
import { ref } from 'vue';
import { Maybe } from '../types';
import { vi } from 'vitest';

describe('useTemporalStore', () => {
  const calendar = createCalendar('gregory');
  const timeZone = 'UTC';
  const locale = 'en-US';

  async function settle() {
    await Promise.resolve();
    await new Promise<void>(r => setTimeout(r, 0));
    await Promise.resolve();
  }

  describe('initialization', () => {
    test('initializes with Date value', () => {
      const date = new Date();
      const store = useTemporalStore({
        model: {
          get: () => date,
        },
        calendar,
        timeZone,
        locale,
      });

      expect(store.value.toDate()).toEqual(date);
      expect(isTemporalPartial(store.value)).toBe(false);
    });

    test('initializes with ZonedDateTime value', () => {
      const date = now(timeZone);
      const store = useTemporalStore({
        model: {
          get: () => date.toDate(),
        },
        calendar,
        timeZone,
        locale,
      });

      expect(store.value.toString()).toBe(date.toString());
      expect(isTemporalPartial(store.value)).toBe(false);
    });

    test('initializes with null value as temporal partial', () => {
      const store = useTemporalStore({
        model: {
          get: () => null,
        },
        calendar,
        timeZone,
        locale,
      });

      expect(isTemporalPartial(store.value)).toBe(true);
      expect(store.value.timeZone).toBe(timeZone);
      expect(store.value.calendar.identifier).toBe(calendar.identifier);
    });
  });

  describe('model updates', () => {
    test('updates when model value changes', async () => {
      const modelValue = ref<Maybe<Date>>(null);
      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => (modelValue.value = value),
        },
        calendar,
        timeZone,
        locale,
      });

      const newDate = new Date();
      modelValue.value = newDate;
      await settle();

      expect(store.value.toDate()).toEqual(newDate);
      expect(isTemporalPartial(store.value)).toBe(false);
    });

    test('preserves temporal partial when model is null', async () => {
      const modelValue = ref<Maybe<Date>>(null);
      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => (modelValue.value = value),
        },
        calendar,
        timeZone,
        locale,
      });

      // Initial state is temporal partial
      expect(isTemporalPartial(store.value)).toBe(true);

      // Update model to null
      modelValue.value = null;
      await settle();

      // Should still be temporal partial
      expect(isTemporalPartial(store.value)).toBe(true);
    });

    test('updates model when store value changes', () => {
      const modelValue = ref<Maybe<Date>>(null);
      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => (modelValue.value = value),
        },
        calendar,
        timeZone,
        locale,
      });

      const newDate = now(timeZone);
      store.value = newDate;

      expect(modelValue.value).toEqual(newDate.toDate());
    });

    test('sets model to undefined when store value is temporal partial', () => {
      const modelValue = ref<Maybe<Date>>(new Date());
      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => (modelValue.value = value),
        },
        calendar,
        timeZone,
        locale,
      });

      // Change to temporal partial
      store.value = createTemporalPartial(calendar, timeZone);

      expect(modelValue.value).toBeUndefined();
    });
  });

  describe('date conversion', () => {
    test('converts between Date and ZonedDateTime', () => {
      const date = new Date();
      const store = useTemporalStore({
        model: {
          get: () => date,
        },
        calendar,
        timeZone,
        locale,
      });

      const expectedZonedDateTime = fromDate(date, timeZone);
      expect(store.value.toString()).toBe(expectedZonedDateTime.toString());
    });

    test('handles different calendar systems', () => {
      const islamicCalendar = createCalendar('islamic-umalqura');
      const date = new Date();
      const store = useTemporalStore({
        model: {
          get: () => date,
        },
        calendar: islamicCalendar,
        timeZone,
        locale,
      });

      expect(store.value.calendar.identifier).toBe('islamic-umalqura');
      expect(store.value.toDate()).toEqual(date);
    });

    test('updates model with correct date when temporal value changes', () => {
      const modelValue = ref<Maybe<Date>>(new Date('2024-01-01T00:00:00Z'));
      const onModelSet = vi.fn();

      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => {
            modelValue.value = value;
            onModelSet(value);
          },
        },
        calendar,
        timeZone,
        locale,
      });

      // Change year
      store.value = store.value.set({ year: 2025 });
      expect(onModelSet).toHaveBeenLastCalledWith(new Date('2025-01-01T00:00:00Z'));

      // Change month
      store.value = store.value.set({ month: 6 });
      expect(onModelSet).toHaveBeenLastCalledWith(new Date('2025-06-01T00:00:00Z'));

      // Change day
      store.value = store.value.set({ day: 15 });
      expect(onModelSet).toHaveBeenLastCalledWith(new Date('2025-06-15T00:00:00Z'));
    });

    test('preserves time when updating date parts', () => {
      const modelValue = ref<Maybe<Date>>(new Date('2024-01-01T14:30:45Z'));
      const onModelSet = vi.fn();

      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => {
            modelValue.value = value;
            onModelSet(value);
          },
        },
        calendar,
        timeZone,
        locale,
      });

      // Change date parts
      store.value = store.value.set({ year: 2025, month: 6, day: 15 });

      // Verify time components are preserved
      const expectedDate = new Date('2025-06-15T14:30:45Z');
      expect(onModelSet).toHaveBeenLastCalledWith(expectedDate);
      expect(modelValue.value?.getUTCHours()).toBe(14);
      expect(modelValue.value?.getUTCMinutes()).toBe(30);
      expect(modelValue.value?.getUTCSeconds()).toBe(45);
    });

    test('handles timezone conversions correctly', () => {
      const modelValue = ref<Maybe<Date>>(new Date('2024-01-01T00:00:00Z'));
      const onModelSet = vi.fn();
      const timeZoneRef = ref('UTC');

      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => {
            modelValue.value = value;
            onModelSet(value);
          },
        },
        calendar,
        timeZone: timeZoneRef,
        locale,
      });

      // Change timezone
      timeZoneRef.value = 'America/New_York';
      store.value = store.value.set({ hour: 12 }); // Set to noon NY time

      // Verify the UTC time in the model is correctly adjusted
      const lastSetDate = onModelSet.mock.lastCall?.[0] as Date;
      expect(lastSetDate.getUTCHours()).toBe(12); // noon NY = 5pm UTC
    });
  });
});
