import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { NumberFieldProps, useNumberField } from './useNumberField';
import { type Component } from 'vue';
import { flush } from '@test-utils/flush';
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
    };
  },
  template: `
      <div data-testid="fixture" :class="{ 'touched': isTouched }">
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

test('blur sets touched to true', async () => {
  await render(makeTest());
  expect(screen.getByTestId('fixture').className).not.includes('touched');
  await fireEvent.blur(screen.getByLabelText(label));
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
  await fireEvent.keyDown(screen.getByLabelText(label), { key: 'ArrowUp' });
  expect(screen.getByLabelText(label)).toHaveDisplayValue('1');
  await fireEvent.keyDown(screen.getByLabelText(label), { key: 'ArrowDown' });
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

test('picks up native error messages', async () => {
  await render(makeTest({ required: true }));

  await fireEvent.invalid(screen.getByLabelText(label));
  await flush();
  expect(screen.getByLabelText(label)).toHaveErrorMessage('Constraints not satisfied');

  vi.useRealTimers();
  expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
  vi.useFakeTimers();
});
