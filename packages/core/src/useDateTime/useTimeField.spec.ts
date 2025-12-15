import { render } from '@testing-library/vue';
import { useTimeField } from '.';
import { DateTimeSegment } from './useDateTimeSegment';
import { ref, toValue } from 'vue';
import { StandardSchema } from '../types';
import { page } from 'vitest/browser';
import { expectNoA11yViolations } from '@test-utils/index';

describe('useTimeField', () => {
  function getSegments() {
    return Array.from(document.querySelectorAll('[data-testid="segment"]')) as HTMLElement[];
  }

  function getSegment(type: string) {
    return getSegments().find(el => (el as any).dataset?.segmentType === type);
  }

  async function beforeInput(el: HTMLElement, data: string) {
    el.dispatchEvent(new InputEvent('beforeinput', { data, cancelable: true, bubbles: true }));
  }

  async function keyDown(el: HTMLElement, code: string) {
    el.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
  }

  async function blur(el: HTMLElement) {
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  }

  describe('initialization', () => {
    test('initializes with value prop', async () => {
      render({
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

      await expect.poll(() => getSegment('hour')?.textContent).toBe('14');
      await expect.poll(() => getSegment('minute')?.textContent).toBe('30');
    });

    test('initializes with modelValue prop', async () => {
      const modelValue = ref('14:30');

      render({
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

      await expect.poll(() => getSegment('hour')?.textContent).toBe('14');
    });

    test('initializes with 12-hour format', async () => {
      render({
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

      await expect.poll(() => getSegment('hour')?.textContent).toBe('02');
      await expect.poll(() => getSegment('dayPeriod')?.textContent).toBeTruthy(); // Should have AM/PM
    });

    test('initializes with seconds', async () => {
      render({
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

      await expect.poll(() => getSegment('second')?.textContent).toBe('45');
    });
  });

  describe('accessibility', () => {
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

      render({
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

      await expect.element(page.getByTestId('error')).toHaveTextContent('Time is required');
      await expect.element(page.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
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

      render({
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

      // Initially should show required error
      await expect.element(page.getByTestId('error')).toHaveTextContent('Time is required');

      updateVal('08:30');
      await expect.element(page.getByTestId('error')).toHaveTextContent('Time must be after 9:00');

      // Set to a valid time
      updateVal('09:30');
      await expect.element(page.getByTestId('error')).toHaveTextContent('');
    });

    test('sets blurred state when any segment is blurred', async () => {
      render({
        components: { DateTimeSegment },
        setup() {
          const { segments, controlProps, labelProps, isTouched, isBlurred } = useTimeField({
            label: 'Time',
            name: 'time',
          });

          return {
            segments,
            controlProps,
            labelProps,
            isTouched,
            isBlurred,
          };
        },
        template: `
          <div>
            <span v-bind="labelProps">Time</span>
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

      const hourSegment = getSegment('hour')!;
      await blur(hourSegment);
      await expect.element(control).toHaveAttribute('data-blurred', 'true');
    });

    test('sets touched state when any segment is manipulated', async () => {
      render({
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

      const control = page.getByRole('group');
      await expect.element(control).toHaveAttribute('data-touched', 'false');

      const hourSegment = getSegment('hour')!;
      await beforeInput(hourSegment, '9');
      await expect.element(control).toHaveAttribute('data-touched', 'true');
    });
  });

  describe('format handling', () => {
    test('handles time format with hours and minutes only', async () => {
      let fieldValue: string | undefined | null;

      render({
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

      expect(fieldValue).toBe('14:30');
    });

    test('handles time format with hours, minutes, and seconds', async () => {
      let fieldValue: string | undefined | null;

      render({
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

      expect(fieldValue).toBe('14:30:45');
    });
  });

  describe('disabled state', () => {
    test('respects disabled prop', async () => {
      render({
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

      await expect.element(page.getByRole('group')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('readonly state', () => {
    test('respects readonly prop', async () => {
      render({
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

      await expect.poll(() => getSegments().length).toBeGreaterThan(0);
      for (const seg of getSegments()) {
        expect(seg).toHaveAttribute('aria-readonly', 'true');
      }
    });
  });

  describe('constraints', () => {
    test('validates against min time constraint with error message', async () => {
      const minTime = '09:00';
      let updateVal!: (value: string) => void;

      render({
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

      // Set a time before the minimum
      updateVal('08:30');

      // The input should be invalid due to min constraint
      const inputElement = page.getByTestId('control');
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'true');
      await expect.element(inputElement).toHaveAttribute('aria-errormessage', expect.any(String));

      // Set a valid time
      updateVal('09:30');

      // The input should now be valid
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'false');
    });

    test('validates against max time constraint with error message', async () => {
      const maxTime = '17:00';
      let updateVal!: (value: string) => void;

      render({
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

      // Set a time after the maximum
      updateVal('18:30');

      // The input should be invalid due to max constraint
      const inputElement = page.getByTestId('control');
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'true');

      // Set a valid time
      updateVal('16:30');

      // The input should now be valid
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'false');
    });

    test('validates against both min and max time constraints with error messages', async () => {
      const minTime = '09:00';
      const maxTime = '17:00';
      let updateVal!: (value: string) => void;

      render({
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

      // Test time before minimum
      updateVal('08:30');
      const inputElement = page.getByTestId('control');
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'true');

      // Test time after maximum
      updateVal('18:30');
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'true');

      // Test valid time
      updateVal('12:00');
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'false');
    });

    test('built-in min/max constraints trigger validation errors', async () => {
      const minTime = '09:00';
      const maxTime = '17:00';
      let updateVal!: (value: string) => void;

      render({
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

      // Test time before minimum
      updateVal('08:30');
      const inputElement = page.getByTestId('control');
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'true');

      // Test time after maximum
      updateVal('18:30');
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'true');

      // Test valid time
      updateVal('12:00');
      await expect.element(inputElement).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('spinOnly behavior', () => {
    test('segments with spinOnly only respond to arrow key events and not text input', async () => {
      render({
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
                :spin-only="true"
                data-testid="segment"
              />
            </div>
          </div>
        `,
      });

      const hourSegment = getSegment('hour')!;
      const minuteSegment = getSegment('minute')!;

      // Focus the hour segment
      hourSegment.focus();

      // Attempt to input text via beforeinput event
      await beforeInput(hourSegment, '9');

      // The value should remain unchanged
      expect(hourSegment.textContent).toBe('14');

      // Test arrow up key on hour segment
      await keyDown(hourSegment, 'ArrowUp');

      // The value should be incremented
      expect(hourSegment.textContent).toBe('15');

      // Test arrow down key on minute segment
      minuteSegment.focus();
      await keyDown(minuteSegment, 'ArrowDown');

      // The value should be decremented
      expect(minuteSegment.textContent).toBe('29');

      // Ensure input mode is set to 'none' for spinOnly segments
      ['inputmode', 'contenteditable', 'spellcheck', 'autocomplete', 'autocorrect'].forEach(attr => {
        expect(hourSegment).not.toHaveAttribute(attr);
        expect(minuteSegment).not.toHaveAttribute(attr);
      });
    });
  });

  describe('a11y', () => {
    test('provides accessible label and description', async () => {
      render({
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

      await expectNoA11yViolations('[data-testid="fixture"]');
    });
  });
});
