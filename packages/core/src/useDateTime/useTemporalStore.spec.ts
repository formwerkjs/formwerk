import { useTemporalStore } from './useTemporalStore';
import { createTemporalPartial, isTemporalPartial } from './temporalPartial';
import { ref } from 'vue';
import { Maybe } from '../types';
import { flush } from '@test-utils/flush';
import { Temporal } from 'temporal-polyfill';

describe('useTemporalStore', () => {
  const timeZone = 'UTC';
  const locale = 'en-US';

  describe('initialization', () => {
    test('initializes with Date value', () => {
      const date = new Date();
      const store = useTemporalStore({
        model: {
          get: () => date,
        },
        calendar: 'gregory',
        timeZone,
        locale,
      });

      expect(store.value.epochMilliseconds).toBe(date.getTime());
      expect(isTemporalPartial(store.value)).toBe(false);
    });

    test('initializes with ZonedDateTime value', () => {
      const date = Temporal.Now.zonedDateTimeISO(timeZone);
      const store = useTemporalStore({
        model: {
          get: () => new Date(date.epochMilliseconds),
        },
        calendar: 'gregory',
        timeZone,
        locale,
      });

      expect(store.value.epochMilliseconds).toBe(date.epochMilliseconds);
      expect(isTemporalPartial(store.value)).toBe(false);
    });

    test('initializes with null value as temporal partial', () => {
      const store = useTemporalStore({
        model: {
          get: () => null,
        },
        calendar: 'gregory',
        timeZone,
        locale,
      });

      expect(isTemporalPartial(store.value)).toBe(true);
      expect(store.value.timeZoneId).toBe(timeZone);
      expect(store.value.calendarId).toBe('gregory');
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
        calendar: 'gregory',
        timeZone,
        locale,
      });

      const newDate = new Date();
      modelValue.value = newDate;
      await flush();

      expect(store.value.epochMilliseconds).toBe(newDate.getTime());
      expect(isTemporalPartial(store.value)).toBe(false);
    });

    test('preserves temporal partial when model is null', async () => {
      const modelValue = ref<Maybe<Date>>(null);
      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => (modelValue.value = value),
        },
        calendar: 'gregory',
        timeZone,
        locale,
      });

      // Initial state is temporal partial
      expect(isTemporalPartial(store.value)).toBe(true);

      // Update model to null
      modelValue.value = null;
      await flush();

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
        calendar: 'gregory',
        timeZone,
        locale,
      });

      const newDate = Temporal.Now.zonedDateTimeISO(timeZone);
      store.value = newDate;

      expect(modelValue.value).toEqual(new Date(newDate.epochMilliseconds));
    });

    test('sets model to undefined when store value is temporal partial', () => {
      const modelValue = ref<Maybe<Date>>(new Date());
      const store = useTemporalStore({
        model: {
          get: () => modelValue.value,
          set: value => (modelValue.value = value),
        },
        calendar: 'gregory',
        timeZone,
        locale,
      });

      // Change to temporal partial
      store.value = createTemporalPartial('gregory', timeZone);

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
        calendar: 'gregory',
        timeZone,
        locale,
      });

      const expectedZonedDateTime = Temporal.Now.zonedDateTimeISO(timeZone);
      expect(store.value.epochMilliseconds).toBe(expectedZonedDateTime.epochMilliseconds);
    });

    test('handles different calendar systems', () => {
      const islamicCalendar = 'islamic-umalqura';
      const date = new Date();
      const store = useTemporalStore({
        model: {
          get: () => date,
        },
        calendar: islamicCalendar,
        timeZone,
        locale,
      });

      expect(store.value.calendarId).toBe('islamic-umalqura');
      expect(store.value.epochMilliseconds).toBe(date.getTime());
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
        calendar: 'gregory',
        timeZone,
        locale,
      });

      // Change year
      store.value = store.value.with({ year: 2025 });
      expect(onModelSet).toHaveBeenLastCalledWith(new Date('2025-01-01T00:00:00Z'));

      // Change month
      store.value = store.value.with({ month: 6 });
      expect(onModelSet).toHaveBeenLastCalledWith(new Date('2025-06-01T00:00:00Z'));

      // Change day
      store.value = store.value.with({ day: 15 });
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
        calendar: 'gregory',
        timeZone,
        locale,
      });

      // Change date parts
      store.value = store.value.with({ year: 2025, month: 6, day: 15 });

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
        calendar: 'gregory',
        timeZone: timeZoneRef,
        locale,
      });

      // Change timezone
      timeZoneRef.value = 'America/New_York';
      store.value = store.value.with({ hour: 12 }); // Set to noon NY time

      // Verify the UTC time in the model is correctly adjusted
      const lastSetDate = onModelSet.mock.lastCall?.[0] as Date;
      expect(lastSetDate.getUTCHours()).toBe(12); // noon NY = 5pm UTC
    });
  });
});
