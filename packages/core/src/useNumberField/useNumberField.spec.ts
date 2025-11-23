import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { NumberFieldProps, useNumberField } from './useNumberField';
import { type Component } from 'vue';
import { flush, defineStandardSchema } from '@test-utils/index';
import { SetOptional } from 'type-fest';

const label = 'Amount';
const description = 'Enter a valid amount';

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
        <span v-bind="errorMessageProps">{{ errorMessage }}</span>

        <button v-bind="incrementButtonProps">Incr</button>
        <button v-bind="decrementButtonProps">Decr</button>
        <div data-testid="value">{{ JSON.stringify(fieldValue) }}</div>
      </div>
    `,
});

test('should not have a11y errors with labels or descriptions', async () => {
  await render(makeTest());
  vi.useRealTimers();
  expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
  vi.useFakeTimers();
});

test('blur sets blurred to true', async () => {
  await render(makeTest());
  expect(screen.getByTestId('fixture').className).not.includes('blurred');
  await fireEvent.blur(screen.getByLabelText(label));
  expect(screen.getByTestId('fixture').className).includes('blurred');
});

test('input sets touched to true', async () => {
  await render(makeTest());
  expect(screen.getByTestId('fixture').className).not.includes('touched');
  await fireEvent.change(screen.getByLabelText(label), { target: { value: '10' } });
  await flush();
  expect(screen.getByTestId('fixture').className).includes('touched');
});

test('change event updates the value and parses it as a number', async () => {
  await render(makeTest());
  const value = '123';
  await fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
  expect(screen.getByTestId('value')).toHaveTextContent('123');
});

test('arrow up and down should increment and decrement the value', async () => {
  await render(makeTest());
  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowUp' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('1');
  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowDown' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('0');
});

test('increment and decrement buttons should update the value', async () => {
  await render(makeTest());
  await fireEvent.mouseDown(screen.getByLabelText('Increment'));
  expect(screen.getByLabelText(label)).toHaveDisplayValue('1');
  await fireEvent.mouseDown(screen.getByLabelText('Decrement'));
  expect(screen.getByLabelText(label)).toHaveDisplayValue('0');
});

test('Tries out different locales to match the value', async () => {
  await render(makeTest());
  const value = '١٠';
  await fireEvent.change(screen.getByLabelText(label), { target: { value } });
  await flush();
  expect(screen.getByTestId('value')).toHaveTextContent('10');
});

test('Prevents invalid numeric input', async () => {
  await render(makeTest());
  const value = 'test';
  await fireEvent.change(screen.getByLabelText(label), { target: { value } });
  await flush();
  expect(screen.getByTestId('value')).toHaveTextContent('null');
});

test('Applies decimal inputmode if the step contains decimals', async () => {
  await render(makeTest({ step: 1.5 }));
  expect(screen.getByLabelText(label)).toHaveAttribute('inputmode', 'decimal');
});

test('Increments and decrements correctly with decimal steps', async () => {
  await render(makeTest({ step: 0.1, value: 0 }));

  // Test increment
  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowUp' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('0.1');
  expect(screen.getByTestId('value')).toHaveTextContent('0.1');

  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowUp' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('0.2');
  expect(screen.getByTestId('value')).toHaveTextContent('0.2');

  // Test decrement
  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowDown' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('0.1');
  expect(screen.getByTestId('value')).toHaveTextContent('0.1');

  // Test with increment button
  await fireEvent.mouseDown(screen.getByLabelText('Increment'));
  expect(screen.getByLabelText(label)).toHaveDisplayValue('0.2');
  expect(screen.getByTestId('value')).toHaveTextContent('0.2');

  // Test with decrement button
  await fireEvent.mouseDown(screen.getByLabelText('Decrement'));
  expect(screen.getByLabelText(label)).toHaveDisplayValue('0.1');
  expect(screen.getByTestId('value')).toHaveTextContent('0.1');
});

test('Increments and decrements correctly with step 1.5', async () => {
  await render(makeTest({ step: 1.5, value: 0 }));

  // Test increment
  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowUp' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('1.5');
  expect(screen.getByTestId('value')).toHaveTextContent('1.5');

  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowUp' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('3');
  expect(screen.getByTestId('value')).toHaveTextContent('3');

  // Test decrement
  await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowDown' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('1.5');
  expect(screen.getByTestId('value')).toHaveTextContent('1.5');
});

describe('validation', () => {
  test('picks up native error messages', async () => {
    await render(makeTest({ required: true }));

    await fireEvent.invalid(screen.getByLabelText(label));
    await flush();
    expect(screen.getByLabelText(label)).toHaveErrorMessage('Constraints not satisfied');

    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('should revalidate when increment/decrement buttons', async () => {
    const schema = defineStandardSchema<number>(value => {
      return Number(value) > 1
        ? { value: Number(value) }
        : { issues: [{ message: 'Value must be greater than 1', path: [] }] };
    });

    await render(makeTest({ schema }));
    await flush();
    expect(screen.getByLabelText(label)).toHaveErrorMessage();
    await fireEvent.mouseDown(screen.getByLabelText('Increment'));
    expect(screen.getByLabelText(label)).toHaveDisplayValue('1');
    expect(screen.getByLabelText(label)).toHaveErrorMessage();
    await fireEvent.mouseDown(screen.getByLabelText('Increment'));
    await flush();
    expect(screen.getByLabelText(label)).not.toHaveErrorMessage();
  });

  test('should revalidate when increment/decrement with arrows', async () => {
    const schema = defineStandardSchema<number>(value => {
      return Number(value) > 1
        ? { value: Number(value) }
        : { issues: [{ message: 'Value must be greater than 1', path: [] }] };
    });

    await render(makeTest({ schema }));
    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowUp' });
    await flush();
    expect(screen.getByLabelText(label)).toHaveErrorMessage('Value must be greater than 1');

    await fireEvent.keyDown(screen.getByLabelText(label), { code: 'ArrowUp' });
    await flush();
    expect(screen.getByLabelText(label)).not.toHaveErrorMessage();
  });
});

describe('sets initial value', () => {
  test('with value prop', async () => {
    const label = 'Field';

    await render({
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

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue('55');
  });

  test('with modelValue prop', async () => {
    const label = 'Field';

    await render({
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

    await flush();
    expect(screen.getByLabelText(label)).toHaveDisplayValue('55');
  });
});

describe('mouse wheel', () => {
  test('should increment and decrement the value', async () => {
    await render(makeTest());
    await fireEvent.wheel(screen.getByLabelText(label), { deltaY: 100 });
    await fireEvent.wheel(screen.getByLabelText(label), { deltaY: 100 });
    expect(screen.getByLabelText(label)).toHaveDisplayValue('2');
    await fireEvent.wheel(screen.getByLabelText(label), { deltaY: -100 });
    await fireEvent.wheel(screen.getByLabelText(label), { deltaY: -100 });
    expect(screen.getByLabelText(label)).toHaveDisplayValue('0');
  });

  test('should be disabled when disableMouseWheel is true', async () => {
    await render(makeTest({ disableWheel: true, value: 0 }));
    await fireEvent.wheel(screen.getByLabelText(label), { deltaY: 100 });
    await fireEvent.wheel(screen.getByLabelText(label), { deltaY: 100 });
    expect(screen.getByLabelText(label)).toHaveDisplayValue('0');
    await fireEvent.wheel(screen.getByLabelText(label), { deltaY: -100 });
    await fireEvent.wheel(screen.getByLabelText(label), { deltaY: -100 });
    expect(screen.getByLabelText(label)).toHaveDisplayValue('0');
  });
});
