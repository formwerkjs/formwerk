import { page } from 'vitest/browser';
import { useTextField } from './useTextField';
import { describe } from 'vitest';
import { defineComponent, ref } from 'vue';
import { expectNoA11yViolations } from '@test-utils/index';

test('blur sets touched and blurred to true', async () => {
  const label = 'Field';

  page.render({
    setup() {
      const description = 'A friendly field';
      const { inputProps, descriptionProps, labelProps, isTouched, isBlurred } = useTextField({
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
        isBlurred,
      };
    },
    template: `
      <div data-testid="fixture" :class="{ 'touched': isTouched, 'blurred': isBlurred }">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps" class="error-message">description</span>
      </div>
    `,
  });

  const fixture = page.getByTestId('fixture');
  const input = page.getByLabelText(label);

  await expect.element(fixture).not.toHaveClass(/touched/);
  await expect.element(fixture).not.toHaveClass(/blurred/);

  (await input.element()).dispatchEvent(new FocusEvent('blur'));

  await expect.element(fixture).toHaveClass(/touched/);
  await expect.element(fixture).toHaveClass(/blurred/);
});

test('input sets touched to true and updates value', async () => {
  const label = 'Field';

  page.render({
    setup() {
      const description = 'A friendly field';
      const { inputProps, descriptionProps, labelProps, isTouched, fieldValue } = useTextField({
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
        fieldValue,
      };
    },
    template: `
      <div data-testid="fixture" :class="{ 'touched': isTouched }" :data-field-value="fieldValue">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps" class="error-message">description</span>
      </div>
    `,
  });

  const value = 'test input';
  const fixture = page.getByTestId('fixture');
  const input = page.getByLabelText(label);

  await expect.element(fixture).not.toHaveClass(/touched/);
  await expect.element(fixture).not.toHaveAttribute('data-field-value');

  await input.fill(value);

  await expect.element(fixture).toHaveClass(/touched/);
  await expect.element(fixture).toHaveAttribute('data-field-value', value);
});

test('picks up native error messages', async () => {
  const label = 'Field';

  page.render({
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
        <span v-bind="errorMessageProps" data-testid="error-message">{{errorMessage}}</span>
      </div>
    `,
  });

  const input = page.getByLabelText(label);

  (await input.element()).dispatchEvent(new Event('invalid'));

  await expect.element(input).toHaveAttribute('aria-invalid', 'true');
  await expect.element(page.getByTestId('error-message')).toHaveTextContent(/.+/);
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

  page.render({
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

  const input = page.getByLabelText(label);

  await expect.element(input).toHaveValue('');
  await input.fill('New value');
  await expect.poll(() => model.value).toBe('New value');
});

describe('sets initial value', () => {
  test('with value prop', async () => {
    const label = 'Field';

    page.render({
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

    await expect.element(page.getByLabelText(label)).toHaveValue('Initial value');
  });

  test('with modelValue prop', async () => {
    const label = 'Field';

    page.render({
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

    await expect.element(page.getByLabelText(label)).toHaveValue('Initial value');
  });

  test('for textarea', async () => {
    const label = 'Field';

    page.render({
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

    await expect.element(page.getByLabelText(label)).toHaveValue('Initial value');
  });
});

describe('a11y', () => {
  test('with label and input combo', async () => {
    page.render({
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

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('with custom label and input combo', async () => {
    page.render({
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

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('with no label element', async () => {
    page.render({
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

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});
