import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useTimeField } from '.';
import { flush } from '@test-utils/flush';
import { DateTimeSegment } from './useDateTimeSegment';
import { ref, toValue } from 'vue';
import { StandardSchema } from '../types';
import { fireEvent } from '@testing-library/vue';

describe('useTimeField', () => {
  describe('initialization', () => {
    test('initializes with value prop', async () => {
      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useTimeField({
            label: 'Time',
            name: 'time',
            value: '14:30',
          });

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Time</label>
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
      const hourSegment = segments.find(el => el.dataset.segmentType === 'hour');
      const minuteSegment = segments.find(el => el.dataset.segmentType === 'minute');

      expect(hourSegment?.textContent).toBe('14');
      expect(minuteSegment?.textContent).toBe('30');
    });

    test('initializes with modelValue prop', async () => {
      const modelValue = ref('14:30');

      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useTimeField({
            label: 'Time',
            name: 'time',
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
            <label v-bind="labelProps">Time</label>
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
      const hourSegment = segments.find(el => el.dataset.segmentType === 'hour');
      expect(hourSegment?.textContent).toBe('14');
    });

    test('initializes with 12-hour format', async () => {
      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useTimeField({
            label: 'Time',
            name: 'time',
            value: '14:30',
            formatOptions: {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            },
          });

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Time</label>
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
      const hourSegment = segments.find(el => el.dataset.segmentType === 'hour');
      const dayPeriodSegment = segments.find(el => el.dataset.segmentType === 'dayPeriod');

      expect(hourSegment?.textContent).toBe('02');
      expect(dayPeriodSegment?.textContent).toBeTruthy(); // Should have PM
    });

    test('initializes with seconds', async () => {
      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useTimeField({
            label: 'Time',
            name: 'time',
            value: '14:30:45',
            formatOptions: {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            },
          });

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Time</label>
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
      const secondSegment = segments.find(el => el.dataset.segmentType === 'second');

      expect(secondSegment?.textContent).toBe('45');
    });
  });

  describe('accessibility', () => {
    test('provides accessible label and description', async () => {
      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, descriptionProps } = useTimeField({
            label: 'Appointment Time',
            name: 'appointmentTime',
            description: 'Enter your preferred appointment time',
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
            <span v-bind="labelProps">Appointment Time</span>
            <div v-bind="controlProps">
              <DateTimeSegment
                v-for="segment in segments"
                :key="segment.type"
                v-bind="segment"
                data-testid="segment"
              />
            </div>
            <div v-bind="descriptionProps">Enter your preferred appointment time</div>
          </div>
        `,
      });

      await flush();
      vi.useRealTimers();
      expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
      vi.useFakeTimers();

      const control = screen.getByRole('group');
      expect(control).toHaveAccessibleDescription('Enter your preferred appointment time');
      expect(control).toHaveAccessibleName('Appointment Time');
    });

    test('shows error message when validation fails', async () => {
      const schema: StandardSchema<string, string> = {
        '~standard': {
          vendor: 'formwerk',
          version: 1,
          validate: value => {
            if (!value) {
              return {
                issues: [{ path: [], message: 'Time is required' }],
              };
            }

            return {
              value: value as string,
            };
          },
        },
      };

      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, errorMessageProps, errorMessage } = useTimeField({
            label: 'Time',
            name: 'time',
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
            <span v-bind="labelProps">Time</span>
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
      expect(control).toHaveErrorMessage('Time is required');
    });

    test('updates validation when time changes', async () => {
      const modelValue = ref<string | undefined>(undefined);
      let updateVal!: (value: string) => void;
      const schema: StandardSchema<string, string> = {
        '~standard': {
          vendor: 'formwerk',
          version: 1,
          validate: value => {
            if (!value) {
              return {
                issues: [{ path: [], message: 'Time is required' }],
              };
            }

            // Time must be after 9:00
            const [hours] = (typeof value === 'string' ? value.split(':') : []).map(Number);
            if (hours < 9) {
              return {
                issues: [{ path: [], message: 'Time must be after 9:00' }],
              };
            }

            return {
              value: value as string,
            };
          },
        },
      };

      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, errorMessageProps, errorMessage, setValue } = useTimeField({
            label: 'Time',
            name: 'time',
            modelValue,
            schema,
          });
          updateVal = (value: string) => {
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
            <span v-bind="labelProps">Time</span>
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
      expect(control).toHaveErrorMessage('Time is required');

      updateVal('08:30');
      await flush();
      expect(control).toHaveErrorMessage('Time must be after 9:00');

      // Set to a valid time
      updateVal('09:30');
      await flush();
      expect(control).not.toHaveErrorMessage();
    });

    test('sets touched state when any segment is blurred', async () => {
      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, isTouched } = useTimeField({
            label: 'Time',
            name: 'time',
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
            <span v-bind="labelProps">Time</span>
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

      // Blur hour segment
      const hourSegment = segments.find(el => el.dataset.segmentType === 'hour')!;
      await fireEvent.blur(hourSegment);
      await flush();
      expect(control.dataset.touched).toBe('true');
    });
  });

  describe('format handling', () => {
    test('handles time format with hours and minutes only', async () => {
      let fieldValue: string | undefined | null;

      await render({
        components: { DateTimeSegment },
        setup() {
          const {
            segments,
            controlProps,
            labelProps,
            setValue,
            fieldValue: value,
          } = useTimeField({
            label: 'Time',
            name: 'time',
            value: '14:30',
          });

          fieldValue = toValue(value);

          return {
            segments,
            controlProps,
            labelProps,
            setValue,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Time</label>
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
      expect(fieldValue).toBe('14:30');
    });

    test('handles time format with hours, minutes, and seconds', async () => {
      let fieldValue: string | undefined | null;

      await render({
        components: { DateTimeSegment },
        setup() {
          const {
            segments,
            controlProps,
            labelProps,
            setValue,
            fieldValue: value,
          } = useTimeField({
            label: 'Time',
            name: 'time',
            value: '14:30:45',
            formatOptions: {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            },
          });

          fieldValue = toValue(value);

          return {
            segments,
            controlProps,
            labelProps,
            setValue,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Time</label>
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
      expect(fieldValue).toBe('14:30:45');
    });
  });

  describe('disabled state', () => {
    test('respects disabled prop', async () => {
      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useTimeField({
            label: 'Time',
            name: 'time',
            value: '14:30',
            disabled: true,
          });

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Time</label>
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
      const control = screen.getByRole('group');
      expect(control).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('readonly state', () => {
    test('respects readonly prop', async () => {
      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps } = useTimeField({
            label: 'Time',
            name: 'time',
            value: '14:30',
            readonly: true,
          });

          return {
            segments,
            controlProps,
            labelProps,
          };
        },
        template: `
          <div>
            <label v-bind="labelProps">Time</label>
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
      segments.forEach(segment => {
        expect(segment).toHaveAttribute('aria-readonly', 'true');
      });
    });
  });

  describe('constraints', () => {
    test('validates against min time constraint with error message', async () => {
      const minTime = '09:00';
      let updateVal!: (value: string) => void;

      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, errorMessageProps, errorMessage, setValue } = useTimeField({
            label: 'Time',
            name: 'time',
            min: minTime,
          });

          updateVal = (value: string) => {
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
            <span v-bind="labelProps">Time</span>
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

      // Set a time before the minimum
      updateVal('08:30');
      await flush();

      // The input should be invalid due to min constraint
      const inputElement = screen.getByTestId('control');
      expect(inputElement).toBeInvalid();

      // Check that the error message is displayed
      expect(inputElement).toHaveErrorMessage('Constraints not satisfied');

      // Set a valid time
      updateVal('09:30');
      await flush();

      // The input should now be valid
      expect(inputElement).toBeValid();
      expect(inputElement).not.toHaveErrorMessage();
    });

    test('validates against max time constraint with error message', async () => {
      const maxTime = '17:00';
      let updateVal!: (value: string) => void;

      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, errorMessageProps, errorMessage, setValue } = useTimeField({
            label: 'Time',
            name: 'time',
            max: maxTime,
          });

          updateVal = (value: string) => {
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
            <span v-bind="labelProps">Time</span>
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

      // Set a time after the maximum
      updateVal('18:30');
      await flush();

      // The input should be invalid due to max constraint
      const inputElement = screen.getByTestId('control');
      expect(inputElement).toBeInvalid();

      // Check that the error message is displayed
      expect(inputElement).toHaveErrorMessage('Constraints not satisfied');

      // Set a valid time
      updateVal('16:30');
      await flush();

      // The input should now be valid
      expect(inputElement).toBeValid();
      expect(inputElement).not.toHaveErrorMessage();
    });

    test('validates against both min and max time constraints with error messages', async () => {
      const minTime = '09:00';
      const maxTime = '17:00';
      let updateVal!: (value: string) => void;

      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, errorMessageProps, errorMessage, setValue } = useTimeField({
            label: 'Time',
            name: 'time',
            min: minTime,
            max: maxTime,
          });

          updateVal = (value: string) => {
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
            <span v-bind="labelProps">Time</span>
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

      // Test time before minimum
      updateVal('08:30');
      await flush();
      const inputElement = screen.getByTestId('control');
      expect(inputElement).toBeInvalid();
      expect(inputElement).toHaveErrorMessage('Constraints not satisfied');

      // Test time after maximum
      updateVal('18:30');
      await flush();
      expect(inputElement).toBeInvalid();
      expect(inputElement).toHaveErrorMessage('Constraints not satisfied');

      // Test valid time
      updateVal('12:00');
      await flush();
      expect(inputElement).toBeValid();
      expect(inputElement).not.toHaveErrorMessage();
    });

    test('built-in min/max constraints trigger validation errors', async () => {
      const minTime = '09:00';
      const maxTime = '17:00';
      let updateVal!: (value: string) => void;

      await render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, errorMessageProps, errorMessage, setValue } = useTimeField({
            label: 'Time',
            name: 'time',
            min: minTime,
            max: maxTime,
          });

          updateVal = (value: string) => {
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
            <span v-bind="labelProps">Time</span>
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

      // Test time before minimum
      updateVal('08:30');
      await flush();
      const inputElement = screen.getByTestId('control');
      expect(inputElement).toBeInvalid();

      // Test time after maximum
      updateVal('18:30');
      await flush();
      expect(inputElement).toBeInvalid();

      // Test valid time
      updateVal('12:00');
      await flush();
      expect(inputElement).toBeValid();
    });
  });
});
