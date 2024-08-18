import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useTextField } from './useTextField';
import { flush } from '@test-utils/flush';
import { describe } from 'vitest';

describe('should not have a11y errors', () => {
  test('with label and input combo', async () => {
    await render({
      setup() {
        const label = 'Field';
        const description = 'A friendly field';
        const { inputProps, descriptionProps, labelProps } = useTextField({
          label,
          description,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps" class="error-message">description</span>
      </div>
    `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('with custom label and input combo', async () => {
    await render({
      setup() {
        const label = 'Field';
        const description = 'A friendly field';
        const { inputProps, descriptionProps, labelProps } = useTextField({
          label,
          description,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
        };
      },
      template: `
      <div data-testid="fixture">
        <div v-bind="labelProps">{{ label }}</div>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps" class="error-message">description</span>
      </div>
    `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('with no label element', async () => {
    await render({
      setup() {
        const label = 'Field';
        const description = 'A friendly field';
        const { inputProps, descriptionProps } = useTextField({
          label,
          description,
        });

        return {
          inputProps,
          descriptionProps,
          label,
          description,
        };
      },
      template: `
      <div data-testid="fixture">
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps" class="error-message">description</span>
      </div>
    `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

test('blur sets touched to true', async () => {
  const label = 'Field';

  await render({
    setup() {
      const description = 'A friendly field';
      const { inputProps, descriptionProps, labelProps, isTouched } = useTextField({
        label,
        description,
      });

      return {
        inputProps,
        descriptionProps,
        labelProps,
        label,
        description,
        isTouched,
      };
    },
    template: `
      <div data-testid="fixture" :class="{ 'touched': isTouched }">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps" class="error-message">description</span>
      </div>
    `,
  });

  await flush();
  expect(screen.getByTestId('fixture').className).not.includes('touched');
  await fireEvent.blur(screen.getByLabelText(label));
  expect(screen.getByTestId('fixture').className).includes('touched');
});

test('change event updates the value', async () => {
  const label = 'Field';

  await render({
    setup() {
      const description = 'A friendly field';
      const { inputProps, descriptionProps, labelProps } = useTextField({
        label,
        description,
      });

      return {
        inputProps,
        descriptionProps,
        labelProps,
        label,
        description,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps" class="error-message">description</span>
      </div>
    `,
  });

  const value = 'Best keyboard';
  await flush();
  await fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
});
