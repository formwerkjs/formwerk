import { useSearchField } from './useSearchField';
import { page } from 'vitest/browser';
import { expectNoA11yViolations, appRender } from '@test-utils/index';

async function changeValue(target: ReturnType<typeof page.getByLabelText>, value: string) {
  const el = (await target.element()) as HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function keyDown(target: ReturnType<typeof page.getByLabelText>, code: string) {
  (await target.element()).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code }));
}

test('Enter key submit the value using the onSubmit prop', async () => {
  const label = 'Search';
  const onSubmit = vi.fn();

  appRender({
    setup() {
      const description = 'Search for the thing';
      const { inputProps, descriptionProps, labelProps } = useSearchField({
        label,
        description,
        onSubmit,
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
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
  });

  const value = 'Best keyboard';
  const input = page.getByLabelText(label, { exact: true });
  await changeValue(input, value);
  await keyDown(input, 'Enter');
  expect(onSubmit).toHaveBeenCalledOnce();
  expect(onSubmit).toHaveBeenLastCalledWith(value);
});

test('blur sets touched to true', async () => {
  const label = 'Search';

  appRender({
    setup() {
      const description = 'Search for the thing';
      const { inputProps, descriptionProps, labelProps, isTouched } = useSearchField({
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
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
  });

  const fixture = page.getByTestId('fixture');
  const input = page.getByLabelText(label, { exact: true });
  await expect.element(fixture).not.toHaveClass(/touched/);
  (await input.element()).dispatchEvent(new FocusEvent('blur'));
  await expect.element(fixture).toHaveClass(/touched/);
});

describe('Escape key', async () => {
  const label = 'Search';
  const value = 'Best keyboard';

  test('clears the value', async () => {
    appRender({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps } = useSearchField({
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
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
    });

    const input = page.getByLabelText(label);
    await changeValue(input, value);
    await expect.element(input).toHaveValue(value);
    await keyDown(input, 'Escape');
    await expect.element(input).toHaveValue('');
  });

  test('ignored when disabled', async () => {
    appRender({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps } = useSearchField({
          label,
          description,
          value,
          disabled: true,
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
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
    });

    const input = page.getByLabelText(label);
    await expect.element(input).toHaveValue(value);
    await keyDown(input, 'Escape');
    await expect.element(input).toHaveValue(value);
  });

  test('ignored when readonly', async () => {
    appRender({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps } = useSearchField({
          label,
          description,
          value,
          readonly: true,
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
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
    });

    const input = page.getByLabelText(label);
    await expect.element(input).toHaveValue(value);
    await keyDown(input, 'Escape');
    await expect.element(input).toHaveValue(value);
  });
});

describe('Clear button', () => {
  const label = 'Search';
  const value = 'Best keyboard';

  test('clears the value', async () => {
    appRender({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps, clearBtnProps } = useSearchField({
          label,
          description,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
          clearBtnProps,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <button v-bind="clearBtnProps">Clear</button>
      </div>
    `,
    });

    const input = page.getByLabelText(label, { exact: true });
    await changeValue(input, value);
    await expect.element(input).toHaveValue(value);
    await page.getByLabelText('Clear search', { exact: true }).click();
    await expect.element(input).toHaveValue('');
  });

  test('ignored when disabled', async () => {
    appRender({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps, clearBtnProps } = useSearchField({
          label,
          description,
          disabled: true,
          value,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
          clearBtnProps,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <button v-bind="clearBtnProps">Clear</button>
      </div>
    `,
    });

    const input = page.getByLabelText(label, { exact: true });
    await expect.element(input).toHaveValue(value);
    await page.getByLabelText('Clear search', { exact: true }).click();
    await expect.element(input).toHaveValue(value);
  });

  test('ignored when readonly', async () => {
    appRender({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps, clearBtnProps } = useSearchField({
          label,
          description,
          readonly: true,
          value,
        });

        return {
          inputProps,
          descriptionProps,
          labelProps,
          label,
          description,
          clearBtnProps,
        };
      },
      template: `
      <div data-testid="fixture">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <button v-bind="clearBtnProps">Clear</button>
      </div>
    `,
    });

    const input = page.getByLabelText(label, { exact: true });
    await expect.element(input).toHaveValue(value);
    await page.getByLabelText('Clear search', { exact: true }).click();
    await expect.element(input).toHaveValue(value);
  });
});

test('change event updates the value', async () => {
  const label = 'Search';

  appRender({
    setup() {
      const description = 'Search for the thing';
      const { inputProps, descriptionProps, labelProps } = useSearchField({
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
        <span v-bind="descriptionProps">description</span>
      </div>
    `,
  });

  const value = 'Best keyboard';
  const input = page.getByLabelText(label, { exact: true });
  const el = (await input.element()) as HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  await expect.element(input).toHaveValue(value);
});

test('value prop sets the initial value', async () => {
  const label = 'Field';

  appRender({
    setup() {
      const { inputProps, labelProps } = useSearchField({
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

test('modelValue prop sets the initial value', async () => {
  const label = 'Field';

  appRender({
    setup() {
      const { inputProps, labelProps } = useSearchField({
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

describe('a11y', () => {
  test('useSearchField should not have a11y errors with labels or descriptions', async () => {
    appRender({
      setup() {
        const label = 'Search';
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps } = useSearchField({
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
          <span v-bind="descriptionProps">description</span>
        </div>
      `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('useSearchField picks up native error messages', async () => {
    const label = 'Search';

    appRender({
      setup() {
        const description = 'Search for the thing';
        const { inputProps, descriptionProps, labelProps } = useSearchField({
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
        };
      },
      template: `
        <div data-testid="fixture">
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
          <span v-bind="descriptionProps">description</span>
        </div>
      `,
    });

    const input = page.getByLabelText(label, { exact: true });
    (await input.element()).dispatchEvent(new Event('invalid', { bubbles: true }));
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    const el = (await input.element()) as HTMLInputElement;
    expect(el.validationMessage).toMatch(/.+/);

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});
