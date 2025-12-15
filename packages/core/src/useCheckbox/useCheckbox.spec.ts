import { CheckboxProps, useCheckbox } from './useCheckbox';
import { describe } from 'vitest';
import { render } from '@testing-library/vue';
import { Component, defineComponent } from 'vue';
import { renderSetup } from '@test-utils/index';
import { useCheckboxGroup } from './useCheckboxGroup';
import { page } from 'vitest/browser';
import { expectNoA11yViolations } from '@test-utils/index';

const InputBase: string = `
   <div>
    <input v-bind="inputProps" />
    <label v-bind="labelProps">{{ label }}</label>
    <span v-bind="errorMessageProps">{{ errorMessage }}</span>
    <span data-testid="value">{{ fieldValue }}</span>
  </div>
`;

const CustomBase: string = `
  <div>
    <div v-bind="inputProps"></div>
    <div v-bind="labelProps" >{{ label }}</div>
    <span v-bind="errorMessageProps">{{ errorMessage }}</span>
    <span data-testid="value">{{ fieldValue }}</span>
  </div>
`;

function createCheckbox<TValue = boolean>(props: CheckboxProps<TValue>, template = InputBase): Component {
  return defineComponent({
    template,
    inheritAttrs: false,
    setup() {
      const box = useCheckbox(props);

      return {
        ...props,
        ...box,
      };
    },
  });
}

describe('value toggling on click', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox({ label: 'First' });

    render({
      components: { Checkbox },
      template: `
        <Checkbox label="First"  />
      `,
    });

    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await page.getByLabelText('First').element()).click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('true');
    (await page.getByLabelText('First').element()).click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('false');
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox({ label: 'First' }, CustomBase);

    render({
      components: { Checkbox },
      template: `
        <Checkbox label="First" />
      `,
    });

    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await page.getByLabelText('First').element()).click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('true');
    (await page.getByLabelText('First').element()).click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('false');
  });
});

describe('value toggling on space key', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox({ label: 'First' });

    render({
      components: { Checkbox },
      template: `
        <Checkbox label="First"  />
      `,
    });

    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('true');
    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('false');
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox({ label: 'First' }, CustomBase);

    render({
      components: { Checkbox },
      template: `
        <Checkbox label="First" />
      `,
    });

    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('true');
    (await page.getByLabelText('First').element()).dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await expect.element(page.getByTestId('value')).toHaveTextContent('false');
  });
});

describe('value toggling with custom true and false values', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox({ label: 'First', trueValue: '1', falseValue: '2' });

    render({
      components: { Checkbox },
      template: `
        <Checkbox label="First"  />
      `,
    });

    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await page.getByLabelText('First').element()).click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('1');
    (await page.getByLabelText('First').element()).click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox({ label: 'First', trueValue: '1', falseValue: '2' }, CustomBase);

    render({
      components: { Checkbox },
      template: `
        <Checkbox label="First" />
      `,
    });

    await expect.element(page.getByTestId('value')).toHaveTextContent('');
    (await page.getByLabelText('First').element()).click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('1');
    (await page.getByLabelText('First').element()).click();
    await expect.element(page.getByTestId('value')).toHaveTextContent('2');
  });
});

describe('isGrouped state', () => {
  test('reports false if no group as a parent', async () => {
    const { isGrouped } = renderSetup(() => {
      return useCheckbox({ label: 'First' });
    });

    expect(isGrouped).toBe(false);
  });
  test('reports true if there is a group as a parent', async () => {
    const { isGrouped } = renderSetup(
      () => {
        return useCheckboxGroup({ label: 'Group' });
      },
      () => {
        return useCheckbox({ label: 'First' });
      },
    );

    expect(isGrouped).toBe(true);
  });

  test('standalone prop overrides group context', async () => {
    const { isGrouped } = renderSetup(
      () => {
        return useCheckboxGroup({ label: 'Group' });
      },
      () => {
        return useCheckbox({ label: 'First', standalone: true });
      },
    );

    expect(isGrouped).toBe(false);
  });
});

describe('a11y', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox({ label: 'First' });

    render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox value="1" />
        </div>
      `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox({ label: 'First' }, CustomBase);

    render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox value="1" />
        </div>
      `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('picks up native error messages', async () => {
    const label = 'First';
    const Checkbox = createCheckbox({ label, required: true });

    render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox label="First" value="1"  />
        </div>
      `,
    });

    const input = page.getByLabelText(label);
    (await input.element()).dispatchEvent(new Event('invalid', { bubbles: true }));

    // Native messages vary per browser; we only assert that we picked up something.
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    const el = (await input.element()) as HTMLInputElement;
    expect(el.validationMessage).toMatch(/.+/);

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});
