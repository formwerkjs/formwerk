import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useSwitch } from './useSwitch';
import { flush } from '@test-utils/flush';
import { describe } from 'vitest';

describe('with input as base element', () => {
  test('should not have a11y errors', async () => {
    await render({
      setup() {
        const label = 'Subscribe to our newsletter';
        const { inputProps, labelProps, isPressed } = useSwitch({
          label,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
        };
      },
      template: `
      <div data-testid="fixture">
        <input v-bind="inputProps" type="checkbox" />
        <label class="ml-2" v-bind="labelProps">{{ label }}</label>
      </div>
    `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('clicking toggles the value', async () => {
    const label = 'Subscribe to our newsletter';
    await render({
      setup() {
        const { inputProps, labelProps, isPressed, fieldValue } = useSwitch({
          label,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
          fieldValue,
        };
      },
      template: `
      <div>
        <input v-bind="inputProps" type="checkbox" />
        <label class="ml-2" v-bind="labelProps">{{ label }}</label>
        <div data-testid="value">{{ fieldValue }}</div>
      </div>
    `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(screen.getByLabelText(label)).not.toBeChecked();
    await fireEvent.click(screen.getByLabelText(label));
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    expect(screen.getByLabelText(label)).toBeChecked();
    await fireEvent.click(screen.getByLabelText(label));
    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(screen.getByLabelText(label)).not.toBeChecked();
  });

  test('Space key or Enter toggles the value', async () => {
    const label = 'Subscribe to our newsletter';
    await render({
      setup() {
        const { inputProps, labelProps, isPressed, fieldValue } = useSwitch({
          label,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
          fieldValue,
        };
      },
      template: `
      <div>
        <input v-bind="inputProps" type="checkbox" />
        <label class="ml-2" v-bind="labelProps">{{ label }}</label>
        <div data-testid="value">{{ fieldValue }}</div>
      </div>
    `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(screen.getByLabelText(label)).not.toBeChecked();
    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'Enter' });
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    expect(screen.getByLabelText(label)).toBeChecked();
    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(screen.getByLabelText(label)).not.toBeChecked();
  });

  test('Can toggle between two custom values', async () => {
    const label = 'Subscribe to our newsletter';
    const trueValue = { yes: true };
    const falseValue = 'nay';
    await render({
      setup() {
        const { inputProps, labelProps, isPressed, fieldValue } = useSwitch({
          label,
          trueValue,
          falseValue,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
          fieldValue,
        };
      },
      template: `
      <div>
        <input v-bind="inputProps" type="checkbox" />
        <label class="ml-2" v-bind="labelProps">{{ label }}</label>
        <div data-testid="value">{{ fieldValue }}</div>
      </div>
    `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('nay');
    await fireEvent.click(screen.getByLabelText(label));
    expect(screen.getByTestId('value')).toContainHTML('"yes": true');
    await fireEvent.click(screen.getByLabelText(label));
    expect(screen.getByTestId('value')).toHaveTextContent('nay');
    await fireEvent.click(screen.getByLabelText(label));
    expect(screen.getByTestId('value')).toContainHTML('"yes": true');
  });

  test('picks up native validation', async () => {
    const label = 'Subscribe to our newsletter';
    await render({
      setup() {
        const { inputProps, labelProps, isPressed, errorMessage, errorMessageProps } = useSwitch({
          label,
          required: true,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
          errorMessage,
          errorMessageProps,
        };
      },
      template: `
      <div data-testid="fixture">
        <input v-bind="inputProps" type="checkbox" />
        <label class="ml-2" v-bind="labelProps">{{ label }}</label>
        <span v-bind="errorMessageProps">{{ errorMessage }}</span>
      </div>
    `,
    });

    await fireEvent.invalid(screen.getByLabelText(label));
    await flush();
    expect(screen.getByLabelText(label)).toHaveErrorMessage('Constraints not satisfied');

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

describe('with custom base element', () => {
  test('should not have a11y errors with custom base element implementation', async () => {
    await render({
      setup() {
        const label = 'Subscribe to our newsletter';
        const { inputProps, labelProps, isPressed } = useSwitch({
          label,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
        };
      },
      template: `
      <div data-testid="fixture">
        <div v-bind="switchProps"></div>
        <div class="ml-2" v-bind="labelProps">{{ label }}</div>
      </div>
    `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('clicking toggles the value', async () => {
    const label = 'Subscribe to our newsletter';
    await render({
      setup() {
        const { inputProps, labelProps, isPressed, fieldValue } = useSwitch({
          label,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
          fieldValue,
        };
      },
      template: `
      <div>
        <div v-bind="inputProps"></div>
        <div class="ml-2" v-bind="labelProps">{{ label }}</div>
        <div data-testid="value">{{ fieldValue }}</div>
      </div>
    `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-checked', 'false');
    await fireEvent.click(screen.getByLabelText(label));
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-checked', 'true');
    await fireEvent.click(screen.getByLabelText(label));
    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-checked', 'false');
  });

  test('Space key or Enter toggles the value', async () => {
    const label = 'Subscribe to our newsletter';
    await render({
      setup() {
        const { inputProps, labelProps, isPressed, fieldValue } = useSwitch({
          label,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
          fieldValue,
        };
      },
      template: `
        <div>
          <div v-bind="inputProps"></div>
          <div class="ml-2" v-bind="labelProps">{{ label }}</div>
          <div data-testid="value">{{ fieldValue }}</div>
        </div>
      `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-checked', 'false');
    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'Enter' });
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-checked', 'true');
    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('false');
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-checked', 'false');
  });
});
