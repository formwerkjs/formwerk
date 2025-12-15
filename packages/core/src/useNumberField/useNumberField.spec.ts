import { render } from '@testing-library/vue';
import { NumberFieldProps, useNumberField } from './useNumberField';
import { type Component } from 'vue';
import { defineStandardSchema } from '@test-utils/index';
import { SetOptional } from 'type-fest';
import { page } from 'vitest/browser';
import { expectNoA11yViolations } from '@test-utils/index';

const label = 'Amount';
const description = 'Enter a valid amount';

async function changeValue(input: ReturnType<typeof page.getByLabelText>, value: string) {
  const el = (await input.element()) as HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function keyDown(target: ReturnType<typeof page.getByLabelText>, init: KeyboardEventInit & { code?: string }) {
  (await target.element()).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
}

async function mouseDown(target: ReturnType<typeof page.getByLabelText>) {
  (await target.element()).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}

async function wheel(target: ReturnType<typeof page.getByLabelText>, deltaY: number) {
  (await target.element()).dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY }));
}

const makeTest = (props?: SetOptional<NumberFieldProps, 'label'>): Component => ({
  setup() {
    const {
      fieldValue,
      inputProps,
      descriptionProps,
      labelProps,
      incrementButtonProps,
      decrementButtonProps,
      isTouched,
      errorMessageProps,
      errorMessage,
      isBlurred,
    } = useNumberField({
      ...(props || {}),
      label,
      description,
    });

    return {
      inputProps,
      descriptionProps,
      labelProps,
      label,
      description,
      incrementButtonProps,
      decrementButtonProps,
      isTouched,
      fieldValue,
      errorMessageProps,
      errorMessage,
      isBlurred,
    };
  },
  template: `
      <div data-testid="fixture" :class="{ 'touched': isTouched, 'blurred': isBlurred }">
        <label v-bind="labelProps">{{ label }}</label>
        <input v-bind="inputProps" />
        <span v-bind="descriptionProps">description</span>
        <span data-testid="error-message" v-bind="errorMessageProps">{{ errorMessage }}</span>

        <button v-bind="incrementButtonProps">Incr</button>
        <button v-bind="decrementButtonProps">Decr</button>
        <div data-testid="value">{{ JSON.stringify(fieldValue) }}</div>
      </div>
    `,
});

test('blur sets blurred to true', async () => {
  render(makeTest());
  const fixture = page.getByTestId('fixture');
  const input = page.getByLabelText(label);

  await expect.element(fixture).not.toHaveClass(/blurred/);
  (await input.element()).dispatchEvent(new FocusEvent('blur'));
  await expect.element(fixture).toHaveClass(/blurred/);
});

test('input sets touched to true', async () => {
  render(makeTest());
  const fixture = page.getByTestId('fixture');
  const input = page.getByLabelText(label);

  await expect.element(fixture).not.toHaveClass(/touched/);
  await changeValue(input, '10');
  await expect.element(fixture).toHaveClass(/touched/);
});

test('change event updates the value and parses it as a number', async () => {
  render(makeTest());
  const value = '123';
  const input = page.getByLabelText(label);
  await changeValue(input, value);
  await expect.element(input).toHaveValue(value);
  await expect.element(page.getByTestId('value')).toHaveTextContent('123');
});

test('arrow up and down should increment and decrement the value', async () => {
  render(makeTest());
  const input = page.getByLabelText(label);
  await keyDown(input, { code: 'ArrowUp' });
  await expect.element(input).toHaveValue('1');
  await keyDown(input, { code: 'ArrowDown' });
  await expect.element(input).toHaveValue('0');
});

test('increment and decrement buttons should update the value', async () => {
  render(makeTest());
  const input = page.getByLabelText(label);
  await mouseDown(page.getByLabelText('Increment'));
  await expect.element(input).toHaveValue('1');
  await mouseDown(page.getByLabelText('Decrement'));
  await expect.element(input).toHaveValue('0');
});

test('Tries out different locales to match the value', async () => {
  render(makeTest());
  const value = '١٠';
  await changeValue(page.getByLabelText(label), value);
  await expect.element(page.getByTestId('value')).toHaveTextContent('10');
});

test('Prevents invalid numeric input', async () => {
  render(makeTest());
  const value = 'test';
  await changeValue(page.getByLabelText(label), value);
  await expect.element(page.getByTestId('value')).toHaveTextContent('null');
});

test('Applies decimal inputmode if the step contains decimals', async () => {
  render(makeTest({ step: 1.5 }));
  await expect.element(page.getByLabelText(label)).toHaveAttribute('inputmode', 'decimal');
});

test('Increments and decrements correctly with decimal steps', async () => {
  render(makeTest({ step: 0.1, value: 0 }));
  const input = page.getByLabelText(label);

  // Test increment
  await keyDown(input, { code: 'ArrowUp' });
  await expect.element(input).toHaveValue('0.1');
  await expect.element(page.getByTestId('value')).toHaveTextContent('0.1');

  await keyDown(input, { code: 'ArrowUp' });
  await expect.element(input).toHaveValue('0.2');
  await expect.element(page.getByTestId('value')).toHaveTextContent('0.2');

  // Test decrement
  await keyDown(input, { code: 'ArrowDown' });
  await expect.element(input).toHaveValue('0.1');
  await expect.element(page.getByTestId('value')).toHaveTextContent('0.1');

  // Test with increment button
  await mouseDown(page.getByLabelText('Increment'));
  await expect.element(input).toHaveValue('0.2');
  await expect.element(page.getByTestId('value')).toHaveTextContent('0.2');

  // Test with decrement button
  await mouseDown(page.getByLabelText('Decrement'));
  await expect.element(input).toHaveValue('0.1');
  await expect.element(page.getByTestId('value')).toHaveTextContent('0.1');
});

test('Increments and decrements correctly with step 1.5', async () => {
  render(makeTest({ step: 1.5, value: 0 }));
  const input = page.getByLabelText(label);

  // Test increment
  await keyDown(input, { code: 'ArrowUp' });
  await expect.element(input).toHaveValue('1.5');
  await expect.element(page.getByTestId('value')).toHaveTextContent('1.5');

  await keyDown(input, { code: 'ArrowUp' });
  await expect.element(input).toHaveValue('3');
  await expect.element(page.getByTestId('value')).toHaveTextContent('3');

  // Test decrement
  await keyDown(input, { code: 'ArrowDown' });
  await expect.element(input).toHaveValue('1.5');
  await expect.element(page.getByTestId('value')).toHaveTextContent('1.5');
});

describe('validation', () => {
  test('should revalidate when increment/decrement buttons', async () => {
    const schema = defineStandardSchema<number>(value => {
      return Number(value) > 1
        ? { value: Number(value) }
        : { issues: [{ message: 'Value must be greater than 1', path: [] }] };
    });

    render(makeTest({ schema }));
    const error = page.getByTestId('error-message');
    const input = page.getByLabelText(label);
    await expect.element(error).toHaveTextContent('');

    await mouseDown(page.getByLabelText('Increment'));
    await expect.element(input).toHaveValue('1');
    await expect.element(error).toHaveTextContent('');

    await mouseDown(page.getByLabelText('Increment'));
    await expect.element(error).toHaveTextContent('');
  });

  test('should revalidate when increment/decrement with arrows', async () => {
    const schema = defineStandardSchema<number>(value => {
      return Number(value) > 1
        ? { value: Number(value) }
        : { issues: [{ message: 'Value must be greater than 1', path: [] }] };
    });

    render(makeTest({ schema }));
    const error = page.getByTestId('error-message');
    const input = page.getByLabelText(label);
    await keyDown(input, { code: 'ArrowUp' });
    await expect.element(error).toHaveTextContent('Value must be greater than 1');

    await keyDown(input, { code: 'ArrowUp' });
    await expect.element(error).toHaveTextContent('');
  });
});

describe('sets initial value', () => {
  test('with value prop', async () => {
    const label = 'Field';

    render({
      setup() {
        const { inputProps, labelProps } = useNumberField({
          label,
          value: '55',
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

    await expect.element(page.getByLabelText(label)).toHaveValue('55');
  });

  test('with modelValue prop', async () => {
    const label = 'Field';

    render({
      setup() {
        const { inputProps, labelProps } = useNumberField({
          label,
          modelValue: 55,
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

    await expect.element(page.getByLabelText(label)).toHaveValue('55');
  });
});

describe('mouse wheel', () => {
  test('should increment and decrement the value', async () => {
    render(makeTest());
    const input = page.getByLabelText(label);
    await wheel(input, 100);
    await wheel(input, 100);
    await expect.element(input).toHaveValue('2');
    await wheel(input, -100);
    await wheel(input, -100);
    await expect.element(input).toHaveValue('0');
  });

  test('should be disabled when disableMouseWheel is true', async () => {
    render(makeTest({ disableWheel: true, value: 0 }));
    const input = page.getByLabelText(label);
    await wheel(input, 100);
    await wheel(input, 100);
    await expect.element(input).toHaveValue('0');
    await wheel(input, -100);
    await wheel(input, -100);
    await expect.element(input).toHaveValue('0');
  });
});

describe('a11y', () => {
  test('useNumberField should not have a11y errors with labels or descriptions', async () => {
    render(makeTest());
    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('useNumberField picks up native error messages', async () => {
    render(makeTest({ required: true }));

    const input = page.getByLabelText(label);
    (await input.element()).dispatchEvent(new Event('invalid', { bubbles: true }));

    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    const el = (await input.element()) as HTMLInputElement;
    expect(el.validationMessage).toMatch(/.+/);

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});
