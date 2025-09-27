import { DateFormatter, fromDate } from '@internationalized/date';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { Ref, ref, shallowRef } from 'vue';
import { fireEvent, render, screen } from '@testing-library/vue';
import { flush } from '@test-utils/flush';
import { DateTimeSegment } from './useDateTimeSegment';
import { createTemporalPartial, isTemporalPartial } from './temporalPartial';
import { TemporalPartial } from './types';
import { getSegmentTypePlaceholder } from './constants';

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

  describe('segment registration', () => {
    test('registers and unregisters segments', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      await render({
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

      await flush();
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('segment navigation', () => {
    test('handles keyboard navigation between segments', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment').filter(el => el.dataset.segmentType !== 'literal');
      segments[0].focus();

      // Test right arrow navigation
      await fireEvent.keyDown(segments[0], { code: 'ArrowRight' });
      expect(document.activeElement).toBe(segments[1]);

      // Test left arrow navigation
      await fireEvent.keyDown(segments[1], { code: 'ArrowLeft' });
      expect(document.activeElement).toBe(segments[0]);
    });

    test('respects RTL direction', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment').filter(el => el.dataset.segmentType !== 'literal');
      segments[0].focus();

      // Test right arrow navigation (should go left in RTL)
      await fireEvent.keyDown(segments[1], { code: 'ArrowRight' });
      expect(document.activeElement).toBe(segments[0]);

      // Test left arrow navigation (should go right in RTL)
      await fireEvent.keyDown(segments[0], { code: 'ArrowLeft' });
      expect(document.activeElement).toBe(segments[1]);
    });
  });

  describe('value updates', () => {
    test('increments segment values', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();
      let monthRegistration!: ReturnType<ReturnType<typeof useDateTimeSegmentGroup>['useDateSegmentRegistration']>;

      await render({
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

      await render({
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

      await render({
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

      await render({
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

      await render({
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

      await flush();
      const monthSegment = document.querySelector('[data-testid="month"]');
      expect(monthSegment?.textContent?.trim()).toBe(currentDate.month.toString());
    });
  });

  describe('segment input handling', () => {
    test('handles numeric input', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month')!;
      fireEvent.focus(monthSegment);

      // Test valid numeric input
      const inputEvent = new InputEvent('beforeinput', { data: '1', cancelable: true });
      fireEvent(monthSegment, inputEvent);
      expect(monthSegment.textContent).toBe('1');

      // Test input completion on max length
      const secondInputEvent = new InputEvent('beforeinput', { data: '2', cancelable: true });
      fireEvent(monthSegment, secondInputEvent);
      expect(monthSegment.textContent).toBe('12');
      expect(document.activeElement).not.toBe(monthSegment); // Should move to next segment

      // Test invalid input (out of range)
      fireEvent.focus(monthSegment);
      const invalidInputEvent = new InputEvent('beforeinput', { data: '13', cancelable: true });
      fireEvent(monthSegment, invalidInputEvent);
      expect(monthSegment.textContent).not.toBe('13');
    });

    test('handles backspace correctly', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const yearSegment = segments.find(el => el.dataset.segmentType === 'year')!;
      fireEvent.focus(yearSegment);

      // Test backspace single digit removal when inputting
      const inputEvent = new InputEvent('beforeinput', { data: '2', cancelable: true });
      fireEvent(yearSegment, inputEvent);
      const secondInputEvent = new InputEvent('beforeinput', { data: '0', cancelable: true });
      fireEvent(yearSegment, secondInputEvent);
      expect(yearSegment.textContent).toBe('20');

      await fireEvent.keyDown(yearSegment, { code: 'Backspace' });
      expect(yearSegment.textContent).toBe('2');
      expect(onValueChange).not.toHaveBeenCalled();

      await fireEvent.keyDown(yearSegment, { code: 'Backspace' });
      expect(yearSegment.textContent).toBe(getSegmentTypePlaceholder('year'));
      expect(onValueChange).toBeCalled();
      let lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].year).toBe(false);

      // Test backspace clear removal after focussing
      await fireEvent(yearSegment, new InputEvent('beforeinput', { data: '2024', cancelable: true }));
      fireEvent.blur(yearSegment);
      await flush();
      expect(onValueChange).toBeCalled();

      fireEvent.focus(yearSegment);
      await fireEvent.keyDown(yearSegment, { code: 'Backspace' });
      expect(yearSegment.textContent).toBe(getSegmentTypePlaceholder('year'));
      expect(onValueChange).toBeCalled();
      lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].year).toBe(false);
    });

    test('handles keyboard navigation and actions', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month')!;
      monthSegment.focus();

      // Test increment with arrow up
      await fireEvent.keyDown(monthSegment, { code: 'ArrowUp' });
      expect(onValueChange).toHaveBeenCalledWith(currentDate.add({ months: 1 }));

      // Test decrement with arrow down
      await fireEvent.keyDown(monthSegment, { code: 'ArrowDown' });
      expect(onValueChange).toHaveBeenCalledWith(currentDate.subtract({ months: 1 }));

      // Test clearing with backspace
      await fireEvent.keyDown(monthSegment, { code: 'Backspace' });
      const lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].month).toBe(false);

      // Test clearing with delete
      await fireEvent.keyDown(monthSegment, { code: 'Delete' });
      const finalCall = onValueChange.mock.lastCall?.[0];
      expect(finalCall['~fw_temporal_partial'].month).toBe(false);
    });

    test('handles non-numeric input', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month')!;
      monthSegment.focus();

      // Test non-numeric input
      const nonNumericEvent = new InputEvent('beforeinput', { data: 'a', cancelable: true });
      fireEvent(monthSegment, nonNumericEvent);
      expect(nonNumericEvent.defaultPrevented).toBe(true);
      expect(monthSegment.textContent).not.toBe('a');
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

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const dayPeriodSegment = segments.find(el => el.dataset.segmentType === 'dayPeriod')!;
      dayPeriodSegment.focus();

      // Test numeric input is blocked
      const inputEvent = new InputEvent('beforeinput', { data: '1', cancelable: true });
      fireEvent(dayPeriodSegment, inputEvent);
      expect(inputEvent.defaultPrevented).toBe(true);
      expect(dayPeriodSegment.textContent).not.toBe('1');

      // Test arrow up changes period (AM -> PM)
      await fireEvent.keyDown(dayPeriodSegment, { code: 'ArrowUp' });
      expect(onValueChange).toHaveBeenCalledWith(currentDate.add({ hours: 12 }).set({ day: currentDate.day }));

      // Test arrow down changes period (PM -> AM)
      await fireEvent.keyDown(dayPeriodSegment, { code: 'ArrowDown' });
      expect(onValueChange).toHaveBeenCalledWith(currentDate.subtract({ hours: 12 }).set({ day: currentDate.day }));

      // Test clearing with backspace
      await fireEvent.keyDown(dayPeriodSegment, { code: 'Backspace' });
      const lastCall = onValueChange.mock.lastCall?.[0];
      expect(lastCall['~fw_temporal_partial'].dayPeriod).toBe(false);

      // Test clearing with delete
      await fireEvent.keyDown(dayPeriodSegment, { code: 'Delete' });
      const finalCall = onValueChange.mock.lastCall?.[0];
      expect(finalCall['~fw_temporal_partial'].dayPeriod).toBe(false);
    });

    test.fails('converts to non-partial when all segments are filled', async () => {
      const formatter = ref(createFormatter());
      const controlEl = shallowRef<HTMLElement>();
      const onValueChange = vi.fn();
      const initialDate = currentDate.set({ year: 2024, month: 1, day: 1 });

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');

      // Fill in month segment
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month')!;
      fireEvent.focus(monthSegment);
      const monthInput = new InputEvent('beforeinput', { data: '3', cancelable: true });
      fireEvent(monthSegment, monthInput);
      fireEvent.blur(monthSegment);
      await flush();
      expect(onValueChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          '~fw_temporal_partial': {
            month: true,
          },
        }),
      );

      // Fill in day segment
      const daySegment = segments.find(el => el.dataset.segmentType === 'day')!;
      fireEvent.focus(daySegment);
      fireEvent.keyDown(daySegment, { code: 'ArrowUp' });
      await flush();
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
      fireEvent.focus(yearSegment);
      const yearInput = new InputEvent('beforeinput', { data: '2024', cancelable: true });
      fireEvent(yearSegment, yearInput);
      fireEvent.blur(yearSegment);
      await flush();
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

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');

      // Fill in only month and day segments
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month')!;
      monthSegment.focus();
      const monthInput = new InputEvent('beforeinput', { data: '3', cancelable: true });
      monthSegment.dispatchEvent(monthInput);

      const daySegment = segments.find(el => el.dataset.segmentType === 'day')!;
      daySegment.focus();
      const dayInput = new InputEvent('beforeinput', { data: '5', cancelable: true });
      daySegment.dispatchEvent(dayInput);

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
