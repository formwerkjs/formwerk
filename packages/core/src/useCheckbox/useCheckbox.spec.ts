import { CheckboxProps, useCheckbox } from './useCheckbox';
import { describe } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { Component, defineComponent } from 'vue';
import { flush } from '@test-utils/flush';

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

const createCheckbox = (props: CheckboxProps, template = InputBase): Component => {
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
};

describe('has no a11y violations', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox({ label: 'First' });

    await render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox value="1" />
        </div>
      `,
    });

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox({ label: 'First' }, CustomBase);

    await render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox value="1" />
        </div>
      `,
    });

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

describe('value toggling on click', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox({ label: 'First' });

    await render({
      components: { Checkbox },
      template: `
        <Checkbox label="First"  />
      `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox({ label: 'First' }, CustomBase);

    await render({
      components: { Checkbox },
      template: `
        <Checkbox label="First" />
      `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });
});

describe('value toggling on space key', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox({ label: 'First' });

    await render({
      components: { Checkbox },
      template: `
        <Checkbox label="First"  />
      `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('');
    await fireEvent.keyDown(screen.getByLabelText('First'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    await fireEvent.keyDown(screen.getByLabelText('First'), { code: 'Space' });
    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox({ label: 'First' }, CustomBase);

    await render({
      components: { Checkbox },
      template: `
        <Checkbox label="First" />
      `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('true');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });
});

describe('value toggling with custom true and false values', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox({ label: 'First', trueValue: '1', falseValue: '2' });

    await render({
      components: { Checkbox },
      template: `
        <Checkbox label="First"  />
      `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox({ label: 'First', trueValue: '1', falseValue: '2' }, CustomBase);

    await render({
      components: { Checkbox },
      template: `
        <Checkbox label="First" />
      `,
    });

    expect(screen.getByTestId('value')).toHaveTextContent('');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
    await fireEvent.click(screen.getByLabelText('First'));
    expect(screen.getByTestId('value')).toHaveTextContent('2');
  });
});

describe('validation', () => {
  test('picks up native error messages', async () => {
    const Checkbox = createCheckbox({ label: 'First', required: true });

    await render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox label="First" value="1"  />
        </div>
      `,
    });

    await fireEvent.invalid(screen.getByLabelText('First'));
    await flush();
    expect(screen.getByLabelText('First')).toHaveErrorMessage('Constraints not satisfied');

    vi.useRealTimers();
    expect(await axe(screen.getByLabelText('First'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});
