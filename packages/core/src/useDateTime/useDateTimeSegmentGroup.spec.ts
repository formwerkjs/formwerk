import { DateFormatter, fromDate } from '@internationalized/date';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { Ref, ref, shallowRef } from 'vue';
import { DateTimeSegment } from './useDateTimeSegment';
import { createTemporalPartial, isTemporalPartial } from './temporalPartial';
import { TemporalPartial } from './types';
import { getSegmentTypePlaceholder } from './constants';
import { page } from 'vitest/browser';

function dispatchEvent() {
  // NOOP
}

describe('useDateTimeSegmentGroup', () => {
  const timeZone = 'UTC';
  const locale = 'en-US';
  const currentDate = fromDate(new Date('2025-02-11'), timeZone);

  function createFormatter() {
    return new DateFormatter(locale, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  }

  async function settle() {
    await Promise.resolve();
    await new Promise<void>(r => setTimeout(r, 0));
    await Promise.resolve();
  }

  function allRenderedSegments() {
    return Array.from(document.querySelectorAll('[data-testid="segment"]')) as HTMLElement[];
  }

  function renderedSegmentsWithoutLiterals() {
    return allRenderedSegments().filter(el => (el as any).dataset?.segmentType !== 'literal');
  }

  function segmentByType(type: string) {
    return allRenderedSegments().find(el => (el as any).dataset?.segmentType === type);
  }

  function dispatchKey(el: HTMLElement, code: string) {
    el.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  }

  function dispatchBeforeInput(el: HTMLElement, data: string) {
    return el.dispatchEvent(new InputEvent('beforeinput', { data, cancelable: true, bubbles: true }));
  }

  describe('segment registration', () => {
    test('registers and unregisters segments', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        setup() {
          const { segments, useDateSegmentRegistration } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          // Register a segment
          const segment = {
            id: 'test-segment',
            getType: () => 'day' as const,
            getElem: () => document.createElement('div'),
          };

          const registration = useDateSegmentRegistration(segment);

          return {
            segments,
            registration,
          };
        },
        template: `
          <div ref="controlEl">
            <div v-for="segment in segments" :key="segment.type">
              {{ segment.value }}
            </div>
          </div>
        `,
      });

      await settle();
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('segment navigation', () => {
    test('handles keyboard navigation between segments', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const segments = renderedSegmentsWithoutLiterals();
      segments[0].focus();

      // Test right arrow navigation
      dispatchKey(segments[0], 'ArrowRight');
      expect(document.activeElement).toBe(segments[1]);

      // Test left arrow navigation
      dispatchKey(segments[1], 'ArrowLeft');
      expect(document.activeElement).toBe(segments[0]);
    });

    test('respects RTL direction', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            direction: 'rtl',
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const segments = renderedSegmentsWithoutLiterals();
      segments[0].focus();

      // Test right arrow navigation (should go left in RTL)
      dispatchKey(segments[1], 'ArrowRight');
      expect(document.activeElement).toBe(segments[0]);

      // Test left arrow navigation (should go right in RTL)
      dispatchKey(segments[0], 'ArrowLeft');
      expect(document.activeElement).toBe(segments[1]);
    });
  });

  describe('value updates', () => {
    test('increments segment values', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();
      let monthRegistration!: ReturnType<ReturnType<typeof useDateTimeSegmentGroup>['useDateSegmentRegistration']>;

      page.render({
        setup() {
          const { useDateSegmentRegistration } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          const segment = {
            id: 'month-segment',
            getType: () => 'month' as const,
            getElem: () => document.createElement('div'),
          };

          monthRegistration = useDateSegmentRegistration(segment) as any;

          return {};
        },
        template: '<div></div>',
      });

      monthRegistration.increment();
      expect(onValueChange).toHaveBeenCalledWith(currentDate.add({ months: 1 }));
    });

    test('decrements segment values', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();
      let monthRegistration!: ReturnType<ReturnType<typeof useDateTimeSegmentGroup>['useDateSegmentRegistration']>;

      page.render({
        setup() {
          const { useDateSegmentRegistration } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          const segment = {
            id: 'month-segment',
            getType: () => 'month' as const,
            getElem: () => document.createElement('div'),
          };

          monthRegistration = useDateSegmentRegistration(segment) as any;

          return {};
        },
        template: '<div></div>',
      });

      monthRegistration.decrement();
      expect(onValueChange).toHaveBeenCalledWith(currentDate.subtract({ months: 1 }));
    });

    test('sets specific segment values', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();
      let monthRegistration!: ReturnType<ReturnType<typeof useDateTimeSegmentGroup>['useDateSegmentRegistration']>;

      page.render({
        setup() {
          const { useDateSegmentRegistration } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          const segment = {
            id: 'month-segment',
            getType: () => 'month' as const,
            getElem: () => document.createElement('div'),
          };

          monthRegistration = useDateSegmentRegistration(segment) as any;

          return {};
        },
        template: '<div></div>',
      });

      monthRegistration.setValue(6);
      expect(onValueChange).toHaveBeenCalledWith(currentDate.set({ month: 6 }));
    });

    test('clears segment values', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();
      let monthRegistration!: ReturnType<ReturnType<typeof useDateTimeSegmentGroup>['useDateSegmentRegistration']>;

      page.render({
        setup() {
          const { useDateSegmentRegistration } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          const segment = {
            id: 'month-segment',
            getType: () => 'month' as const,
            getElem: () => document.createElement('div'),
          };

          monthRegistration = useDateSegmentRegistration(segment) as any;

          return {};
        },
        template: '<div></div>',
      });

      monthRegistration.clear() as any;
      const lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].month).toBe(false);
    });
  });

  describe('formatting', () => {
    test('formats segments according to locale', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale: 'de-DE',
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
          };
        },
        template: `
          <div>
            <span v-for="segment in segments" :key="segment.type" :data-testid="segment.type">
              {{ segment.value }}
            </span>
          </div>
        `,
      });

      await settle();
      const monthSegment = document.querySelector('[data-testid="month"]');
      expect(monthSegment?.textContent?.trim()).toBe(currentDate.month.toString());
    });
  });

  describe('segment input handling', () => {
    test('handles numeric input', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const monthSegment = segmentByType('month')!;
      monthSegment.focus();

      // Test valid numeric input
      dispatchBeforeInput(monthSegment, '1');
      await expect.poll(() => monthSegment.textContent).toBe('1');

      // Test input completion on max length
      dispatchBeforeInput(monthSegment, '2');
      await expect.poll(() => monthSegment.textContent).toBe('12');
      expect(document.activeElement).not.toBe(monthSegment); // Should move to next segment

      // Test invalid input (out of range)
      monthSegment.focus();
      dispatchBeforeInput(monthSegment, '13');
      expect(monthSegment.textContent).not.toBe('13');
    });

    test('handles backspace correctly', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const yearSegment = segmentByType('year')!;
      yearSegment.focus();

      // Test backspace single digit removal when inputting
      dispatchBeforeInput(yearSegment, '2');
      dispatchBeforeInput(yearSegment, '0');
      expect(yearSegment.textContent).toBe('20');

      dispatchKey(yearSegment, 'Backspace');
      expect(yearSegment.textContent).toBe('2');
      expect(onValueChange).not.toHaveBeenCalled();

      dispatchKey(yearSegment, 'Backspace');
      expect(yearSegment.textContent).toBe(getSegmentTypePlaceholder('year'));
      expect(onValueChange).toBeCalled();
      let lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].year).toBe(false);

      // Test backspace clear removal after focussing
      dispatchBeforeInput(yearSegment, '2024');
      yearSegment.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await settle();
      expect(onValueChange).toBeCalled();

      yearSegment.focus();
      dispatchKey(yearSegment, 'Backspace');
      expect(yearSegment.textContent).toBe(getSegmentTypePlaceholder('year'));
      expect(onValueChange).toBeCalled();
      lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].year).toBe(false);
    });

    test('handles keyboard navigation and actions', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const monthSegment = segmentByType('month')!;
      monthSegment!.focus();

      // Test increment with arrow up
      dispatchKey(monthSegment!, 'ArrowUp');
      expect(onValueChange).toHaveBeenCalledWith(currentDate.add({ months: 1 }));

      // Test decrement with arrow down
      dispatchKey(monthSegment!, 'ArrowDown');
      expect(onValueChange).toHaveBeenCalledWith(currentDate.subtract({ months: 1 }));

      // Test clearing with backspace
      dispatchKey(monthSegment!, 'Backspace');
      const lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].month).toBe(false);

      // Test clearing with delete
      dispatchKey(monthSegment!, 'Delete');
      const finalCall = onValueChange.mock.lastCall?.[0];
      expect(finalCall['~fw_temporal_partial'].month).toBe(false);
    });

    test('handles non-numeric input', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: {},
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const monthSegment = segmentByType('month')!;
      monthSegment!.focus();

      // Test non-numeric input
      const nonNumericEvent = new InputEvent('beforeinput', { data: 'a', cancelable: true, bubbles: true });
      monthSegment!.dispatchEvent(nonNumericEvent);
      expect(nonNumericEvent.defaultPrevented).toBe(true);
      expect(monthSegment!.textContent).not.toBe('a');
    });

    test('handles non-numeric segments (dayPeriod)', async () => {
      const formatter = ref(
        new DateFormatter(locale, {
          hour: 'numeric',
          hour12: true,
          dayPeriod: 'short',
        }),
      );
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: currentDate,
            formatOptions: { hour12: true },
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const dayPeriodSegment = segmentByType('dayPeriod')!;
      dayPeriodSegment!.focus();

      // Test numeric input is blocked
      const inputEvent = new InputEvent('beforeinput', { data: '1', cancelable: true, bubbles: true });
      dayPeriodSegment!.dispatchEvent(inputEvent);
      expect(inputEvent.defaultPrevented).toBe(true);
      expect(dayPeriodSegment!.textContent).not.toBe('1');

      // Test arrow up changes period (AM -> PM)
      dispatchKey(dayPeriodSegment!, 'ArrowUp');
      expect(onValueChange).toHaveBeenCalledWith(currentDate.add({ hours: 12 }).set({ day: currentDate.day }));

      // Test arrow down changes period (PM -> AM)
      dispatchKey(dayPeriodSegment!, 'ArrowDown');
      expect(onValueChange).toHaveBeenCalledWith(currentDate.subtract({ hours: 12 }).set({ day: currentDate.day }));

      // Test clearing with backspace
      dispatchKey(dayPeriodSegment!, 'Backspace');
      const lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].dayPeriod).toBe(false);

      // Test clearing with delete
      dispatchKey(dayPeriodSegment!, 'Delete');
      const finalCall = onValueChange.mock.lastCall?.[0];
      expect(finalCall['~fw_temporal_partial'].dayPeriod).toBe(false);
    });

    test.fails('converts to non-partial when all segments are filled', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();
      const initialDate = currentDate.set({ year: 2024, month: 1, day: 1 });

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue: createTemporalPartial(initialDate.calendar, initialDate.timeZone),
            formatOptions: {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            },
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const segments = allRenderedSegments();

      // Fill in month segment
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month')!;
      monthSegment.focus();
      dispatchBeforeInput(monthSegment, '3');
      monthSegment.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await settle();
      expect(onValueChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          '~fw_temporal_partial': {
            month: true,
          },
        }),
      );

      // Fill in day segment
      const daySegment = segments.find(el => el.dataset.segmentType === 'day')!;
      daySegment.focus();
      dispatchKey(daySegment, 'ArrowUp');
      await settle();
      expect(onValueChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          '~fw_temporal_partial': {
            month: true,
            day: true,
          },
        }),
      );

      // Fill in year segment
      const yearSegment = segments.find(el => el.dataset.segmentType === 'year')!;
      yearSegment.focus();
      dispatchBeforeInput(yearSegment, '2024');
      yearSegment.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await settle();
      expect(onValueChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          '~fw_temporal_partial': {
            month: true,
            day: true,
            year: true,
          },
        }),
      );
      // Verify final call is not a partial
      const finalCall = onValueChange.mock.lastCall?.[0];
      expect(isTemporalPartial(finalCall)).toBe(false);
      expect(finalCall.toString()).toBe(initialDate.set({ month: 3, day: 5 }).toString());
    });

    test('preserves partial state when not all segments are filled', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const initialDate = currentDate.set({ year: 2024, month: 1, day: 1 });
      const temporalValue = ref(
        createTemporalPartial(initialDate.calendar, initialDate.timeZone),
      ) as Ref<TemporalPartial>;
      const onValueChange = vi.fn(v => {
        temporalValue.value = v;
      });

      page.render({
        components: {
          DateTimeSegment,
        },
        setup() {
          const { segments } = useDateTimeSegmentGroup({
            formatter,
            temporalValue,
            formatOptions: {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            },
            locale,
            controlEl,
            onValueChange,
            onTouched: () => {},
            onBlurred: () => {},
            dispatchEvent,
          });

          return {
            segments,
            controlEl,
          };
        },
        template: `
          <div ref="controlEl">
            <DateTimeSegment
              v-for="segment in segments"
              :key="segment.type"
              :data-segment-type="segment.type"
              data-testid="segment"
              v-bind="segment"
            />
          </div>
        `,
      });

      await settle();
      const segments = allRenderedSegments();

      // Fill in only month and day segments
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month')!;
      monthSegment.focus();
      dispatchBeforeInput(monthSegment, '3');

      const daySegment = segments.find(el => el.dataset.segmentType === 'day')!;
      daySegment.focus();
      dispatchBeforeInput(daySegment, '5');

      // Verify the value is still a partial since year is not set
      const lastCall = onValueChange.mock.lastCall?.[0];
      expect(isTemporalPartial(lastCall)).toBe(true);
      expect(lastCall['~fw_temporal_partial']).toEqual({
        day: true,
        month: true,
      });
    });
  });
});
