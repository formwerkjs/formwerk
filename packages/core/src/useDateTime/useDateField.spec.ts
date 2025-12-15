import { render } from '@testing-library/vue';
import { useDateField } from '.';
import { createCalendar, now, toCalendar } from '@internationalized/date';
import { DateTimeSegment } from './useDateTimeSegment';
import { ref, toValue } from 'vue';
import { StandardSchema } from '../types';
import { page } from 'vitest/browser';
import { expectNoA11yViolations } from '@test-utils/index';

describe('useDateField', () => {
  const currentDate = new Date('2024-03-15T12:00:00Z');

  function getSegments() {
    return Array.from(document.querySelectorAll('[data-testid="segment"]')) as HTMLElement[];
  }

  function getSegment(type: string) {
    return getSegments().find(el => (el as any).dataset?.segmentType === type);
  }

  async function beforeInput(el: HTMLElement, data: string) {
    el.dispatchEvent(new InputEvent('beforeinput', { data, cancelable: true, bubbles: true }));
  }

  async function blur(el: HTMLElement) {
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  }

  describe('initialization', () => {
    test('initializes with value prop', async () => {
      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useDateField({
            label: 'Date',
            name: 'date',
            value: currentDate,
          });

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Date</label>
            <div v-bind="controlProps">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
          </div>
        `,
      });

      await expect.poll(() => getSegment('month')?.textContent).toBe('3');
      await expect.poll(() => getSegment('day')?.textContent).toBe('15');
      await expect.poll(() => getSegment('year')?.textContent).toBe('2024');
    });

    test('initializes with modelValue prop', async () => {
      const modelValue = ref(currentDate);

      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useDateField({
            label: 'Date',
            name: 'date',
            modelValue,
          });

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Date</label>
            <div v-bind="controlProps">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
          </div>
        `,
      });

      await expect.poll(() => getSegment('month')?.textContent).toBe('3');
    });
  });

  describe('calendar systems', () => {
    test('supports different calendar systems', async () => {
      const calendar = createCalendar('islamic-umalqura');
      const date = toCalendar(now('UTC'), calendar).set({ year: 1445, month: 9, day: 5 }); // Islamic date

      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useDateField({
            label: 'Date',
            name: 'date',
            calendar,
            value: date.toDate(),
          });

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Date</label>
            <div v-bind="controlProps">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
          </div>
        `,
      });

      await expect.poll(() => getSegment('month')?.textContent).toBe('9');
      await expect.poll(() => getSegment('year')?.textContent).toBe('1445');
    });
  });

  describe('accessibility', () => {
    test('shows error message when validation fails', async () => {
      const schema: StandardSchema<Date, Date> = {
        '~standard': {
          vendor: 'formwerk',
          version: 1,
          validate: value => {
            if (!value) {
              return {
                issues: [{ path: [], message: 'Date is required' }],
              };
            }

            return {
              value: value as Date,
            };
          },
        },
      };

      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, errorMessageProps, errorMessage } = useDateField({
            label: 'Date',
            name: 'date',
            schema,
          });

          return {
            segments,
            controlProps,
            labelProps,
            errorMessageProps,
            errorMessage,
          };
        },
        template: `
          <div>
            <span v-bind="labelProps">Date</span>
            <div v-bind="controlProps">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
            <div v-bind="errorMessageProps" data-testid="error">{{ errorMessage }}</div>
          </div>
        `,
      });

      await expect.element(page.getByTestId('error')).toHaveTextContent('Date is required');
      await expect.element(page.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
    });

    test('updates validation when date changes', async () => {
      const modelValue = ref<Date | undefined>(undefined);
      let updateVal!: (value: Date) => void;
      const schema: StandardSchema<Date, Date> = {
        '~standard': {
          vendor: 'formwerk',
          version: 1,
          validate: value => {
            if (!value) {
              return {
                issues: [{ path: [], message: 'Date is required' }],
              };
            }

            // Date must be in the future
            if ((value as Date).getTime() < new Date().getTime()) {
              return {
                issues: [{ path: [], message: 'Date must be in the future' }],
              };
            }

            return {
              value: value as Date,
            };
          },
        },
      };

      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, errorMessageProps, errorMessage, setValue } = useDateField({
            label: 'Date',
            name: 'date',
            modelValue,
            schema,
          });
          updateVal = (value: Date) => {
            setValue(value);
          };

          return {
            segments,
            controlProps,
            labelProps,
            errorMessageProps,
            errorMessage,
          };
        },
        template: `
          <div>
            <span v-bind="labelProps">Date</span>
            <div v-bind="controlProps" data-testid="control">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
            <div v-bind="errorMessageProps" data-testid="error">{{ errorMessage }}</div>
          </div>
        `,
      });

      // Initially should show required error
      await expect.element(page.getByTestId('error')).toHaveTextContent('Date is required');

      updateVal(new Date('2025-01-01'));
      await expect.element(page.getByTestId('error')).toHaveTextContent('Date must be in the future');

      // Set to a future date (relative to now)
      updateVal(new Date(Date.now() + 24 * 60 * 60 * 1000));
      await expect.element(page.getByTestId('error')).toHaveTextContent('');
    });

    test('sets blurred state when any segment is blurred', async () => {
      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, isBlurred } = useDateField({
            label: 'Date',
            name: 'date',
          });

          return {
            segments,
            controlProps,
            labelProps,
            isBlurred,
          };
        },
        template: `
          <div>
            <span v-bind="labelProps">Date</span>
            <div v-bind="controlProps" :data-blurred="isBlurred">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
          </div>
        `,
      });

      const control = page.getByRole('group');
      await expect.element(control).toHaveAttribute('data-blurred', 'false');

      const monthSegment = getSegment('month')!;
      await blur(monthSegment);
      await expect.element(control).toHaveAttribute('data-blurred', 'true');
    });

    test('sets touched state when any segment is manipulated', async () => {
      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, isTouched } = useDateField({
            label: 'Date',
            name: 'date',
          });

          return {
            segments,
            controlProps,
            labelProps,
            isTouched,
          };
        },
        template: `
          <div>
            <span v-bind="labelProps">Date</span>
            <div v-bind="controlProps" :data-touched="isTouched">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
          </div>
        `,
      });

      const control = page.getByRole('group');
      await expect.element(control).toHaveAttribute('data-touched', 'false');

      const monthSegment = getSegment('month')!;
      await beforeInput(monthSegment, '1');
      await expect.element(control).toHaveAttribute('data-touched', 'true');
    });
  });

  describe('constraints', () => {
    test('respects min and max date constraints', async () => {
      const minDate = now('UTC');
      const maxDate = now('UTC').add({ days: 1 });

      render({
        components: { DateTimeSegment },
        setup() {
          const props = useDateField({
            label: 'Date',
            name: 'date',
            timeZone: 'UTC',
            min: minDate.toDate(),
            max: maxDate.toDate(),
            value: currentDate,
          });

          const { segments, controlProps, labelProps } = props;

          expect(toValue(props.calendarProps.value.min)).toEqual(minDate.toDate());
          expect(toValue(props.calendarProps.value.max)).toEqual(maxDate.toDate());

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Date</label>
            <div v-bind="controlProps">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
          </div>
        `,
      });

      // Assertions for min/max are done inside setup() via `toValue(props.calendarProps.value.*)`
    });
  });

  describe('a11y', () => {
    test('provides accessible label and description', async () => {
      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, descriptionProps } = useDateField({
            label: 'Birth Date',
            name: 'birthDate',
            description: 'Enter your date of birth',
          });

          return {
            segments,
            controlProps,
            labelProps,
            descriptionProps,
          };
        },
        template: `
          <div data-testid="fixture">
            <span v-bind="labelProps">Birth Date</span>
            <div v-bind="controlProps">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
            <div v-bind="descriptionProps">Enter your date of birth</div>
          </div>
        `,
      });

      await expectNoA11yViolations('[data-testid="fixture"]');
    });
  });
});
