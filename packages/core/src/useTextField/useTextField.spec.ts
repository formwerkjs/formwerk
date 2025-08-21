import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useTextField } from './useTextField';
import { flush } from '@test-utils/flush';
import { describe } from 'vitest';
import { defineComponent, ref } from 'vue';

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

test('picks up native error messages', async () => {
  const label = 'Field';

  await render({
    setup() {
      const description = 'A friendly field';
      const { inputProps, descriptionProps, labelProps, errorMessageProps, errorMessage } = useTextField({
        label,
        description,
        required: true,
      });

      return {
        inputProps,
        descriptionProps,
        labelProps,
        label,
        description,
        errorMessageProps,
        errorMessage,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <span v-bind="errorMessageProps">{{errorMessage}}</span>
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

test('supports v-model', async () => {
  const model = ref('');
  const label = 'Field';
  const TextField = defineComponent({
    setup() {
      const { inputProps, labelProps } = useTextField({
        label,
      });

      return {
        inputProps,
        labelProps,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
      </div>
    `,
  });

  await render({
    setup() {
      return {
        model,
      };
    },
    components: {
      TextField,
    },
    template: `
      <div data-testid="fixture">
        <TextField v-model="model" />
      </div>
    `,
  });

  await flush();
  expect(screen.getByLabelText(label)).toHaveDisplayValue('');
  await fireEvent.update(screen.getByLabelText(label), 'New value');
  expect(model.value).toBe('New value');
});

describe('sets initial value', () => {
  test('with value prop', async () => {
    const label = 'Field';

    await render({
      setup() {
        const { inputProps, labelProps } = useTextField({
          label,
          value: 'Initial value',
        });

        return {
          inputProps,
          labelProps,
          label,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
      </div>
    `,
    });

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue('Initial value');
  });

  test('with modelValue prop', async () => {
    const label = 'Field';

    await render({
      setup() {
        const { inputProps, labelProps } = useTextField({
          label,
          modelValue: 'Initial value',
        });

        return {
          inputProps,
          labelProps,
          label,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
      </div>
    `,
    });

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue('Initial value');
  });

  test('for textarea', async () => {
    const label = 'Field';

    await render({
      setup() {
        const { inputProps, labelProps } = useTextField({
          label,
          value: 'Initial value',
        });

        return {
          inputProps,
          labelProps,
          label,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <textarea v-bind="inputProps"></textarea>
      </div>
    `,
    });

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue('Initial value');
  });
});
