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
  </div>
`;

const CustomBase: string = `
  <div>
    <div v-bind="inputProps"></div>
    <div v-bind="labelProps" >{{ label }}</div>
    <span v-bind="errorMessageProps">{{ errorMessage }}</span>
  </div>
`;

const createCheckbox = (template = InputBase): Component => {
  return defineComponent({
    template,
    inheritAttrs: false,
    setup(props: CheckboxProps, { attrs }) {
      const box = useCheckbox({ ...props, ...attrs });

      return {
        ...props,
        ...attrs,
        ...box,
      };
    },
  });
};

describe('has no a11y violations', () => {
  test('with input as base element', async () => {
    const Checkbox = createCheckbox();

    await render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox label="First" value="1" />
        </div>
      `,
    });

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('with custom elements as base', async () => {
    const Checkbox = createCheckbox(CustomBase);

    await render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox label="First" value="1" />
        </div>
      `,
    });

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

describe('validation', () => {
  test('picks up native error messages', async () => {
    const Checkbox = createCheckbox();

    await render({
      components: { Checkbox },
      template: `
        <div data-testid="fixture">
          <Checkbox label="First" value="1" :required="true" />
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
