import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useCustomField } from './useCustomField';
import { flush } from '@test-utils/flush';
import { describe, expect, test, vi } from 'vitest';
import { StandardSchema } from '../types';
import { renderSetup } from '../../../test-utils/src';

describe('useCustomField', () => {
  describe('accessibility', () => {
    test('with label and custom input', async () => {
      await render({
        setup() {
          const label = 'Custom Field';
          const description = 'A custom field description';
          const { controlProps, labelProps, descriptionProps } = useCustomField({
            label,
            description,
          });

          return {
            controlProps,
            labelProps,
            descriptionProps,
            label,
            description,
          };
        },
        template: `
          <div data-testid="fixture">
            <label v-bind="labelProps">{{ label }}</label>
            <div role="textbox" v-bind="controlProps">Custom input</div>
            <span v-bind="descriptionProps">{{ description }}</span>
          </div>
        `,
      });

      await flush();
      vi.useRealTimers();
      expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
      vi.useFakeTimers();
    });

    test('with error message', async () => {
      await render({
        setup() {
          const label = 'Custom Field';
          const { controlProps, labelProps, errorMessageProps } = useCustomField({
            label,
          });

          return {
            controlProps,
            labelProps,
            errorMessageProps,
            label,
          };
        },
        template: `
          <div data-testid="fixture">
            <label v-bind="labelProps">{{ label }}</label>
            <div role="textbox" v-bind="controlProps">Custom input</div>
            <span v-bind="errorMessageProps">Error message</span>
          </div>
        `,
      });

      await flush();
      vi.useRealTimers();
      expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
      vi.useFakeTimers();
    });
  });

  describe('initial value handling', () => {
    test('sets initial value from value prop', async () => {
      const initialValue = 'test value';
      let value;

      await render({
        setup() {
          const { controlProps, fieldValue } = useCustomField({
            label: 'Custom Field',
            value: initialValue,
          });

          value = fieldValue;
          return { controlProps };
        },
        template: '<div v-bind="controlProps">Custom input</div>',
      });

      await flush();
      expect(value.value).toBe(initialValue);
    });

    test('sets initial value from modelValue prop', async () => {
      const initialValue = 'test value';
      let value;

      await render({
        setup() {
          const { controlProps, fieldValue } = useCustomField({
            label: 'Custom Field',
            modelValue: initialValue,
          });

          value = fieldValue;
          return { controlProps };
        },
        template: '<div v-bind="controlProps">Custom input</div>',
      });

      await flush();
      expect(value.value).toBe(initialValue);
    });
  });

  describe('disabled state', () => {
    test('applies disabled state when prop is true', async () => {
      await render({
        setup() {
          const { controlProps } = useCustomField({
            label: 'Custom Field',
            disabled: true,
          });

          return { controlProps };
        },
        template: '<div v-bind="controlProps" data-testid="custom-input">Custom input</div>',
      });

      await flush();
      expect(screen.getByTestId('custom-input')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('readonly state', () => {
    test('applies readonly attribute when prop is true', async () => {
      await render({
        setup() {
          const { controlProps } = useCustomField({
            label: 'Custom Field',
            readonly: true,
          });

          return { controlProps };
        },
        template: '<div v-bind="controlProps" data-testid="custom-input">Custom input</div>',
      });

      await flush();
      expect(screen.getByTestId('custom-input')).toHaveAttribute('aria-readonly', 'true');
    });
  });

  describe('form integration', () => {
    test('uses provided name attribute', async () => {
      await render({
        setup() {
          const { controlProps } = useCustomField({
            label: 'Custom Field',
            name: 'custom-field-name',
          });

          return { controlProps };
        },
        template: '<div v-bind="controlProps" data-testid="custom-input">Custom input</div>',
      });

      await flush();
      expect(screen.getByTestId('custom-input')).toHaveAttribute('name', 'custom-field-name');
    });
  });

  describe('validation', () => {
    test('validates the field', async () => {
      const schema: StandardSchema<string, string> = {
        '~standard': {
          vendor: 'formwerk',
          version: 1,
          validate: value => {
            const strValue = value ? String(value) : undefined;
            if (!strValue || strValue.length < 0) {
              return {
                issues: [{ path: [], message: 'Value is required' }],
              };
            }

            return {
              value: strValue,
            };
          },
        },
      };

      const { validate, errorMessage } = await renderSetup(() => {
        const { validate, errorMessage } = useCustomField({ label: 'Custom Field', schema });

        return { validate, errorMessage };
      });

      expect(errorMessage.value).toBe('');
      await validate();
      await flush();
      expect(errorMessage.value).toBe('Value is required');
    });
  });
});
