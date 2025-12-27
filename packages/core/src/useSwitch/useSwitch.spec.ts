import { SwitchProps, useSwitch } from './useSwitch';
import { describe } from 'vitest';
import { page } from 'vitest/browser';
import { dispatchEvent, expectNoA11yViolations } from '@test-utils/index';

async function keyDown(target: ReturnType<typeof page.getByLabelText>, code: string) {
  await dispatchEvent.keyboard(target, code);
}

describe('with input as base element', () => {
  const label = 'Subscribe to our newsletter';

  async function renderSwitch(props: Partial<SwitchProps<any>> = {}) {
    page.render({
      setup() {
        const { inputProps, labelProps, isPressed, errorMessageProps, errorMessage, fieldValue } = useSwitch({
          label,
          ...props,
        });

        return {
          inputProps,
          labelProps,
          isPressed,
          label,
          errorMessageProps,
          errorMessage,
          fieldValue,
        };
      },
      template: `
      <div data-testid="fixture">
        <input v-bind="inputProps" type="checkbox" />
        <label class="ml-2" v-bind="labelProps">{{ label }}</label>
        <div data-testid="value">{{ fieldValue }}</div>
        <span v-bind="errorMessageProps">{{ errorMessage }}</span>
      </div>
    `,
    });
  }

  test('clicking toggles the value', async () => {
    renderSwitch();

    const value = page.getByTestId('value');
    const input = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
    await input.click();
    await expect.element(value).toHaveTextContent('true');
    await expect.element(input).toBeChecked();
    await input.click();
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
  });

  test('Space key or Enter toggles the value', async () => {
    renderSwitch();

    const value = page.getByTestId('value');
    const input = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
    await keyDown(input, 'Enter');
    await expect.element(value).toHaveTextContent('true');
    await expect.element(input).toBeChecked();
    await keyDown(input, 'Space');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
  });

  test('Can toggle between two custom values', async () => {
    const label = 'Subscribe to our newsletter';
    const trueValue = { yes: true };
    const falseValue = 'nay';

    renderSwitch({ trueValue, falseValue });

    const value = page.getByTestId('value');
    const input = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('nay');
    await input.click();
    await expect.element(value).toHaveTextContent('"yes": true');
    await input.click();
    await expect.element(value).toHaveTextContent('nay');
    await input.click();
    await expect.element(value).toHaveTextContent('"yes": true');
  });

  test('Clicks, Space key, or Enter are ignored when disabled', async () => {
    renderSwitch({ disabled: true });

    const value = page.getByTestId('value');
    const input = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
    await keyDown(input, 'Enter');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
    await keyDown(input, 'Space');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
    // Use dispatchEvent because Playwright's click() waits for element to be enabled
    await dispatchEvent(input, 'click');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
  });

  test('Clicks, Space key, or Enter are ignored when readonly', async () => {
    renderSwitch({ readonly: true });

    const value = page.getByTestId('value');
    const input = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
    await keyDown(input, 'Enter');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
    await keyDown(input, 'Space');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
    await input.click();
    await expect.element(value).toHaveTextContent('false');
    await expect.element(input).not.toBeChecked();
  });
});

describe('with custom base element', () => {
  const label = 'Subscribe to our newsletter';

  async function renderSwitch(props: Partial<SwitchProps> = {}) {
    page.render({
      setup() {
        const { inputProps, labelProps, isPressed, fieldValue } = useSwitch({
          label,
          ...props,
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
        <div data-testid="fixture">
          <div v-bind="inputProps" style="width: 100px; height: 100px;"></div>
          <div class="ml-2" v-bind="labelProps">{{ label }}</div>
          <div data-testid="value">{{ fieldValue }}</div>
        </div>
      `,
    });
  }

  test('clicking toggles the value', async () => {
    renderSwitch();

    const value = page.getByTestId('value');
    const control = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
    await control.click();
    await expect.element(value).toHaveTextContent('true');
    await expect.element(control).toHaveAttribute('aria-checked', 'true');
    await control.click();
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
  });

  test('Space key or Enter toggles the value', async () => {
    renderSwitch();

    const value = page.getByTestId('value');
    const control = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
    await keyDown(control, 'Enter');
    await expect.element(value).toHaveTextContent('true');
    await expect.element(control).toHaveAttribute('aria-checked', 'true');
    await keyDown(control, 'Space');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
  });

  test('Clicks, Space key, or Enter are ignored when disabled', async () => {
    renderSwitch({ disabled: true });

    const value = page.getByTestId('value');
    const control = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
    await keyDown(control, 'Enter');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
    await keyDown(control, 'Space');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
    // Use dispatchEvent because Playwright's click() waits for element to be enabled
    await dispatchEvent(control, 'click');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
  });

  test('Clicks, Space key, or Enter are ignored when readonly', async () => {
    renderSwitch({ readonly: true });

    const value = page.getByTestId('value');
    const control = page.getByLabelText(label);
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
    await keyDown(control, 'Enter');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
    await keyDown(control, 'Space');
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
    await control.click();
    await expect.element(value).toHaveTextContent('false');
    await expect.element(control).toHaveAttribute('aria-checked', 'false');
  });
});

describe('a11y', () => {
  describe('with input as base element', () => {
    const label = 'Subscribe to our newsletter';

    async function renderSwitch(props: Partial<SwitchProps<any>> = {}) {
      page.render({
        setup() {
          const { inputProps, labelProps, errorMessageProps, errorMessage, fieldValue } = useSwitch({
            label,
            ...props,
          });

          return {
            inputProps,
            labelProps,
            label,
            errorMessageProps,
            errorMessage,
            fieldValue,
          };
        },
        template: `
          <div data-testid="fixture">
            <input v-bind="inputProps" type="checkbox" />
            <label class="ml-2" v-bind="labelProps">{{ label }}</label>
            <div data-testid="value">{{ fieldValue }}</div>
            <span v-bind="errorMessageProps">{{ errorMessage }}</span>
          </div>
        `,
      });
    }

    test('should not have a11y errors', async () => {
      renderSwitch();
      await expectNoA11yViolations('[data-testid="fixture"]');
    });

    test('picks up native validation', async () => {
      renderSwitch({ required: true });

      const input = page.getByLabelText(label);
      (await input.element()).dispatchEvent(new Event('invalid', { bubbles: true }));
      await expect.element(input).toHaveAttribute('aria-invalid', 'true');
      const el = (await input.element()) as HTMLInputElement;
      expect(el.validationMessage).toMatch(/.+/);

      await expectNoA11yViolations('[data-testid="fixture"]');
    });
  });

  describe('with custom base element', () => {
    const label = 'Subscribe to our newsletter';

    async function renderSwitch(props: Partial<SwitchProps> = {}) {
      page.render({
        setup() {
          const { inputProps, labelProps, fieldValue } = useSwitch({
            label,
            ...props,
          });

          return {
            inputProps,
            labelProps,
            label,
            fieldValue,
          };
        },
        template: `
          <div data-testid="fixture">
          <div v-bind="inputProps" style="width: 100px; height: 100px;"></div>
            <div class="ml-2" v-bind="labelProps">{{ label }}</div>
            <div data-testid="value">{{ fieldValue }}</div>
          </div>
        `,
      });
    }

    test('should not have a11y errors with custom base element implementation', async () => {
      renderSwitch();
      await expectNoA11yViolations('[data-testid="fixture"]');
    });
  });
});
