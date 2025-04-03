import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useDateField } from '.';
import { flush } from '@test-utils/flush';
import { DateTimeSegment } from './useDateTimeSegment';
import { ref, toValue } from 'vue';
import { StandardSchema } from '../types';
import { fireEvent } from '@testing-library/vue';
import { Temporal } from 'temporal-polyfill';

describe('useDateField', () => {
  const currentDate = new Date('2024-03-15T12:00:00Z');

  describe('initialization', () => {
    test('initializes with value prop', async () => {
      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month');
      const daySegment = segments.find(el => el.dataset.segmentType === 'day');
      const yearSegment = segments.find(el => el.dataset.segmentType === 'year');

      expect(monthSegment?.textContent).toBe('3');
      expect(daySegment?.textContent).toBe('15');
      expect(yearSegment?.textContent).toBe('2024');
    });

    test('initializes with modelValue prop', async () => {
      const modelValue = ref(currentDate);

      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month');
      expect(monthSegment?.textContent).toBe('3');
    });
  });

  describe('calendar systems', () => {
    test('supports different calendar systems', async () => {
      const calendar = 'islamic-umalqura';
      const date = Temporal.Now.zonedDateTimeISO('UTC').withCalendar(calendar).with({ year: 1445, month: 9, day: 5 }); // Islamic date

      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useDateField({
            label: 'Date',
            name: 'date',
            calendar,
            value: new Date(date.epochMilliseconds),
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month');
      const yearSegment = segments.find(el => el.dataset.segmentType === 'year');

      expect(monthSegment?.textContent).toBe('9');
      expect(yearSegment?.textContent).toBe('1445');
    });
  });

  describe('accessibility', () => {
    test('provides accessible label and description', async () => {
      await render({
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

      await flush();
      vi.useRealTimers();
      expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
      vi.useFakeTimers();

      const control = screen.getByRole('group');
      expect(control).toHaveAccessibleDescription('Enter your date of birth');
      expect(control).toHaveAccessibleName('Birth Date');
    });

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

      await render({
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

      await flush();
      const control = screen.getByRole('group');
      expect(control).toHaveErrorMessage('Date is required');
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

      await render({
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

      await flush();
      const control = screen.getByRole('group');

      // Initially should show required error
      expect(control).toHaveErrorMessage('Date is required');

      updateVal(new Date('2025-01-01'));
      await flush();
      expect(control).toHaveErrorMessage('Date must be in the future');

      // Set to a future date
      updateVal(new Date());
      await flush();
      expect(control).not.toHaveErrorMessage();
    });

    test('sets touched state when any segment is blurred', async () => {
      await render({
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

      await flush();
      const segments = screen.getAllByTestId('segment');
      const control = screen.getByRole('group');

      // Initially not touched
      expect(control.dataset.touched).toBe('false');

      // Blur month segment
      const monthSegment = segments.find(el => el.dataset.segmentType === 'month')!;
      await fireEvent.blur(monthSegment);
      await flush();
      expect(control.dataset.touched).toBe('true');
    });
  });

  describe('constraints', () => {
    test('respects min and max date constraints', async () => {
      const minDate = Temporal.Now.zonedDateTimeISO('UTC');
      const maxDate = Temporal.Now.zonedDateTimeISO('UTC').add({ days: 1 });

      await render({
        components: { DateTimeSegment },
        setup() {
          const props = useDateField({
            label: 'Date',
            name: 'date',
            timeZone: 'UTC',
            min: new Date(minDate.epochMilliseconds),
            max: new Date(maxDate.epochMilliseconds),
            value: currentDate,
          });

          const { segments, controlProps, labelProps } = props;

          expect(toValue(props.calendarProps.value.min?.getTime())).toEqual(minDate.epochMilliseconds);
          expect(toValue(props.calendarProps.value.max?.getTime())).toEqual(maxDate.epochMilliseconds);

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

      await flush();
    });
  });
});
