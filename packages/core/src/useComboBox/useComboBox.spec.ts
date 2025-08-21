import { defineComponent, ref, Ref } from 'vue';
import { ComboBoxProps, useComboBox } from '.';
import { useOption } from '../useOption';
import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { flush } from '@test-utils/index';
import { useDefaultFilter } from '../collections';
import { useForm } from '../useForm';

function createComboBox(fixedProps: Partial<ComboBoxProps<any, any>> = {}) {
  const Option = defineComponent({
    props: ['label', 'value', 'disabled'],
    setup(props, { attrs }) {
      const all = { ...attrs, ...props } as any;
      const { optionProps } = useOption(all);

      return {
        optionProps,
        ...all,
      };
    },
    template: `
      <div v-bind="optionProps">{{ label }}</div>
    `,
  });

  let exposedSelectedOption: Ref<any>;
  let exposedInputValue: Ref<any>;

  const component = defineComponent({
    components: { OptionItem: Option },
    setup(props, { attrs }) {
      const all = { ...attrs, ...props, ...fixedProps } as any;
      const {
        labelProps,
        inputProps,
        listBoxProps,
        errorMessageProps,
        descriptionProps,
        buttonProps,
        inputValue,
        errorMessage,
        selectedOption,
      } = useComboBox(all, {
        filter: useDefaultFilter({ caseSensitive: false }).contains,
      });

      exposedSelectedOption = selectedOption;
      exposedInputValue = inputValue;

      const options = all.options || null;
      const getValue = (option: any) => option;

      return {
        ...all,
        labelProps,
        inputProps,
        listBoxProps,
        buttonProps,
        errorMessageProps,
        descriptionProps,
        inputValue,
        getValue,
        errorMessage,
        options,
        selectedOption,
      };
    },
    template: `
        <div data-testid="combobox">
          <label v-bind="labelProps">{{ label }}</label>

          <div>
            <input v-bind="inputProps" />
            <button v-bind="buttonProps">Toggle</button>
          </div>

          <div v-bind="listBoxProps" popover>
            <slot>
              <template v-if="options">
                <OptionItem
                  v-for="(option, idx) in options"
                  :key="(getValue?.(option)) ?? idx"
                  :value="option"
                  :label="option.label"
                  :disabled="!!option.disabled"
                >
                  <slot name="option" :option="option" />
                </OptionItem>
              </template>
            </slot>
          </div>

          <span v-bind="errorMessageProps">
            {{ errorMessage }}
          </span>
        </div>
    `,
  });

  component.getExposedState = () => ({
    selectedOption: exposedSelectedOption.value,
    inputValue: exposedInputValue.value,
  });

  return component;
}

function getInput() {
  return screen.getByRole('combobox');
}

function getButton() {
  return screen.getByRole('button');
}

describe('should not have a11y errors', () => {
  test('with options', async () => {
    await render({
      components: {
        MyComboBox: createComboBox(),
      },
      setup() {
        const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

        return { options };
      },
      template: `
        <div data-testid="fixture">
          <MyComboBox label="Field" :options="options" />
        </div>
      `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

describe('reset', () => {
  test('should set inputValue on reset with values', async () => {
    const MyComboBox = createComboBox();
    const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

    await render({
      components: { MyComboBox },
      setup() {
        const { reset, formProps } = useForm();

        reset({
          value: {
            combo: { label: 'Two' },
          },
        });
        return { options, formProps };
      },
      template: `
        <div data-testid="fixture">
          <form v-bind="formProps">
            <MyComboBox label="Field" name="combo" :options="options" />
          </form>
        </div>
      `,
    });

    expect(MyComboBox.getExposedState().inputValue).toEqual('Two');
  });
});

describe('keyboard features', () => {
  async function renderComboBox(opts?: { label: string; disabled?: boolean }[], props?: { readonly?: boolean }) {
    await render({
      components: {
        MyComboBox: createComboBox(),
      },
      setup() {
        const options = opts || [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];
        const readonly = props?.readonly || false;

        return { options, readonly };
      },
      template: `
        <div data-testid="fixture">
          <MyComboBox label="Field" :options="options" :readonly="readonly" />
        </div>
      `,
    });

    return {
      async open() {
        await fireEvent.click(getButton());
        await flush();
      },
    };
  }

  test('Pressing ArrowDown should open the listbox', async () => {
    await renderComboBox();

    await fireEvent.keyDown(getInput(), { code: 'ArrowDown' });
    await flush();
    expect(getInput()).toHaveAttribute('aria-expanded', 'true');
  });

  test('Pressing ArrowUp should open the listbox', async () => {
    await renderComboBox();

    await fireEvent.keyDown(getInput(), { code: 'ArrowUp' });
    await flush();
    expect(getInput()).toHaveAttribute('aria-expanded', 'true');
  });

  test('Clicking the button should toggle the listbox', async () => {
    await renderComboBox();

    await fireEvent.click(getButton());
    await flush();
    expect(getInput()).toHaveAttribute('aria-expanded', 'true');

    await fireEvent.click(getButton());
    await flush();
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Pressing Escape should close the listbox', async () => {
    const { open } = await renderComboBox();
    await open();

    await fireEvent.keyDown(getInput(), { code: 'Escape' });
    await flush();
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Pressing Tab should close the listbox', async () => {
    const { open } = await renderComboBox();
    await open();

    await fireEvent.keyDown(getInput(), { code: 'Tab' });
    await flush();
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Clicking an option should select it and close the listbox', async () => {
    const { open } = await renderComboBox();
    await open();

    await fireEvent.click(screen.getAllByRole('option')[1]);
    await flush();
    expect(getInput()).toHaveValue('Two');
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Pressing Enter on a focused option should select it', async () => {
    const { open } = await renderComboBox();
    await open();

    await fireEvent.keyDown(screen.getAllByRole('option')[1], { code: 'Enter' });
    await flush();
    expect(getInput()).toHaveValue('Two');
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Should not select disabled options', async () => {
    const { open } = await renderComboBox([{ label: 'One' }, { label: 'Two', disabled: true }, { label: 'Three' }]);
    await open();

    await fireEvent.click(screen.getAllByRole('option')[1]);
    await flush();
    expect(getInput()).not.toHaveValue('Two');
  });

  test('Should revert to last selected value when blurred with invalid input', async () => {
    const { open } = await renderComboBox();
    await open();

    // First select an option
    await fireEvent.click(screen.getAllByRole('option')[1]);
    await flush();
    expect(getInput()).toHaveValue('Two');

    // Type some random text
    await fireEvent.input(getInput(), { target: { value: 'Random stuff' } });
    await flush();
    expect(getInput()).toHaveValue('Random stuff');

    // Blur the input
    await fireEvent.blur(getInput());
    await flush();

    // Should revert back to last selected value
    expect(getInput()).toHaveValue('Two');
  });

  test('Should select option when blurred with relatedTarget being an option', async () => {
    const { open } = await renderComboBox();
    await open();

    // Get the option element we want to simulate clicking
    const option = screen.getAllByRole('option')[1];

    // Simulate blur with relatedTarget being the option
    await fireEvent.blur(getInput(), {
      relatedTarget: option,
    });
    await flush();

    // Should select the option that was "clicked"
    expect(getInput()).toHaveValue('Two');
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('ArrowDown should highlight options in sequence and stop at last option', async () => {
    const { open } = await renderComboBox();
    await open();

    const options = screen.getAllByRole('option');

    // Initially no option should be highlighted
    expect(options[0]).not.toHaveAttribute('aria-selected');
    expect(options[1]).not.toHaveAttribute('aria-selected');
    expect(options[2]).not.toHaveAttribute('aria-selected');

    // Press arrow down to highlight first option
    await fireEvent.keyDown(getInput(), { code: 'ArrowDown' });
    await flush();
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).not.toHaveAttribute('aria-selected');
    expect(options[2]).not.toHaveAttribute('aria-selected');

    // Press arrow down to highlight second option
    await fireEvent.keyDown(getInput(), { code: 'ArrowDown' });
    await flush();
    expect(options[0]).not.toHaveAttribute('aria-selected');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[2]).not.toHaveAttribute('aria-selected');

    // Press arrow down to highlight last option
    await fireEvent.keyDown(getInput(), { code: 'ArrowDown' });
    await flush();
    expect(options[0]).not.toHaveAttribute('aria-selected');
    expect(options[1]).not.toHaveAttribute('aria-selected');
    expect(options[2]).toHaveAttribute('aria-selected', 'true');

    // Press arrow down again - should stay on last option
    await fireEvent.keyDown(getInput(), { code: 'ArrowDown' });
    await flush();
    expect(options[0]).not.toHaveAttribute('aria-selected');
    expect(options[1]).not.toHaveAttribute('aria-selected');
    expect(options[2]).toHaveAttribute('aria-selected', 'true');
  });

  test('ArrowUp should highlight options in reverse sequence and stop at first option', async () => {
    const { open } = await renderComboBox();
    await open();

    const options = screen.getAllByRole('option');

    // Move to last option first
    await fireEvent.keyDown(getInput(), { code: 'End' });
    await flush();
    expect(options[2]).toHaveAttribute('aria-selected', 'true');

    // Press arrow up to highlight second option
    await fireEvent.keyDown(getInput(), { code: 'ArrowUp' });
    await flush();
    expect(options[0]).not.toHaveAttribute('aria-selected');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[2]).not.toHaveAttribute('aria-selected');

    // Press arrow up to highlight first option
    await fireEvent.keyDown(getInput(), { code: 'ArrowUp' });
    await flush();
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).not.toHaveAttribute('aria-selected');
    expect(options[2]).not.toHaveAttribute('aria-selected');

    // Press arrow up again - should stay on first option
    await fireEvent.keyDown(getInput(), { code: 'ArrowUp' });
    await flush();
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).not.toHaveAttribute('aria-selected');
    expect(options[2]).not.toHaveAttribute('aria-selected');
  });

  test('Home key should highlight first option', async () => {
    const { open } = await renderComboBox();
    await open();

    const options = screen.getAllByRole('option');

    // First move to last option
    await fireEvent.keyDown(getInput(), { code: 'End' });
    await flush();
    expect(options[2]).toHaveAttribute('aria-selected', 'true');

    // Press Home to jump to first option
    await fireEvent.keyDown(getInput(), { code: 'Home' });
    await flush();
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).not.toHaveAttribute('aria-selected');
    expect(options[2]).not.toHaveAttribute('aria-selected');
  });

  test('Should open menu when user starts typing', async () => {
    await renderComboBox();

    // Initially menu should be closed
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');

    // Type something
    await fireEvent.keyDown(getInput(), { target: { code: 'T' } });
    await flush();

    // Menu should be open
    expect(getInput()).toHaveAttribute('aria-expanded', 'true');
  });

  test('Enter key should select the highlighted option', async () => {
    const { open } = await renderComboBox();
    await open();

    const options = screen.getAllByRole('option');

    // First highlight second option using arrow down
    await fireEvent.keyDown(getInput(), { code: 'ArrowDown' });
    await fireEvent.keyDown(getInput(), { code: 'ArrowDown' });
    await flush();
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    // Press Enter to select the highlighted option
    await fireEvent.keyDown(getInput(), { code: 'Enter' });
    await flush();

    // Should select the highlighted option and close the menu
    expect(getInput()).toHaveValue('Two');
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape key should clear input value when menu is closed', async () => {
    const { open } = await renderComboBox();

    // First select an option
    await open();
    await fireEvent.click(screen.getAllByRole('option')[1]);
    await flush();
    expect(getInput()).toHaveValue('Two');

    // Press Escape when menu is closed
    await fireEvent.keyDown(getInput(), { code: 'Escape' });
    await flush();

    // Input value should be cleared
    expect(getInput()).toHaveValue('');
    expect(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Should not change value when readonly', async () => {
    const { open } = await renderComboBox([{ label: 'One' }, { label: 'Two' }, { label: 'Three' }], { readonly: true });
    await open();

    await fireEvent.click(screen.getAllByRole('option')[1]);
    await flush();
    expect(getInput()).not.toHaveValue('Two');
  });

  test('Should open menu when focused if openOnFocus is true', async () => {
    await render({
      components: {
        MyComboBox: createComboBox({ openOnFocus: true }),
      },
      setup() {
        const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];
        return { options };
      },
      template: `
        <div data-testid="fixture">
          <MyComboBox
            label="Field"
            :options="options"
          />
        </div>
      `,
    });

    const input = getInput();

    // Initially menu should be closed
    expect(input).toHaveAttribute('aria-expanded', 'false');

    // Focus the input
    await fireEvent.focus(input);
    await flush();

    // Menu should be open
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('filtering', () => {
  test('should filter options based on input value', async () => {
    await render({
      components: {
        MyComboBox: createComboBox(),
      },
      setup() {
        const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

        return {
          options,
          filter: {
            debounceMs: 0,
            fn: ({ option, search }) => option.label.toLowerCase().includes(search.toLowerCase()),
          },
        };
      },
      template: `
        <div data-testid="fixture">
          <MyComboBox
            label="Field"
            :options="options"
            :collection-options="{ filter }"
          />
        </div>
      `,
    });

    const input = getInput();
    await fireEvent.input(input, { target: { value: 'tw' } });
    await flush();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Two');
  });
});

describe('selection state', () => {
  test('selectedOption should reflect the currently selected option', async () => {
    const MyComboBox = createComboBox();
    const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

    await render({
      components: { MyComboBox },
      setup() {
        return { options };
      },
      template: `
        <div data-testid="fixture">
          <MyComboBox label="Field" :options="options" />
        </div>
      `,
    });

    await fireEvent.click(getButton());
    await fireEvent.click(screen.getAllByRole('option')[1]);
    await flush();

    expect(MyComboBox.getExposedState().selectedOption).toEqual({
      id: expect.any(String),
      label: 'Two',
      value: { label: 'Two' },
    });
  });
});

test('Should use onNewValue handler instead of reverting when provided', async () => {
  const onNewValueSpy = vi.fn(value => ({
    label: value + '!',
    value: value + '!',
  }));

  await render({
    components: {
      MyComboBox: createComboBox({ onNewValue: onNewValueSpy }),
    },
    setup() {
      const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];
      return { options };
    },
    template: `
      <div data-testid="fixture">
        <MyComboBox
          label="Field"
          :options="options"
        />
      </div>
    `,
  });

  const input = getInput();

  // Type some text that doesn't match any option
  await fireEvent.input(input, { target: { value: 'Something new' } });
  await flush();

  // Blur the input to trigger the new value handler
  await fireEvent.keyDown(input, { code: 'Tab' });
  await flush();

  // Should have called the handler with the input value
  expect(onNewValueSpy).toHaveBeenCalledWith('Something new');
  expect(onNewValueSpy).toHaveBeenCalledTimes(1);

  // Should show the modified value from onNewValue handler
  expect(getInput()).toHaveValue('Something new!');
});

test('Can reject new values if onNewValue returns undefined', async () => {
  const onNewValueSpy = vi.fn(() => undefined);

  await render({
    components: {
      MyComboBox: createComboBox({ onNewValue: onNewValueSpy }),
    },
    setup() {
      const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];
      return { options };
    },
    template: `
      <div data-testid="fixture">
        <MyComboBox
          label="Field"
          :options="options"
        />
      </div>
    `,
  });

  const input = getInput();

  // Type some text that doesn't match any option
  await fireEvent.input(input, { target: { value: 'Something new' } });
  await flush();

  // Blur the input to trigger the new value handler
  await fireEvent.keyDown(input, { code: 'Tab' });
  await flush();

  // Should have called the handler with the input value
  expect(onNewValueSpy).toHaveBeenCalledWith('Something new');
  expect(onNewValueSpy).toHaveBeenCalledTimes(1);

  // Should show the modified value from onNewValue handler
  expect(getInput()).not.toHaveValue('Something new!');
});

test('Should not accept new value on Enter when readonly', async () => {
  const MyComboBox = createComboBox();
  await render({
    components: { MyComboBox },
    setup() {
      const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];
      const readonly = ref(false);

      return {
        options,
        readonly,
      };
    },
    template: `
      <div data-testid="fixture">
        <MyComboBox
          label="Field"
          :options="options"
          :readonly="readonly"
        />
      </div>
    `,
  });

  const input = getInput();

  // First select an option
  await fireEvent.click(getButton());
  await flush();
  await fireEvent.click(screen.getAllByRole('option')[1]);
  await flush();
  expect(input).toHaveValue('Two');

  // Enable readonly
  await fireEvent.click(getButton());
  await flush();

  // Try to type something new
  await fireEvent.input(input, { target: { value: 'Something new' } });
  await flush();

  // Try to accept the new value with Enter
  await fireEvent.keyDown(input, { code: 'Enter' });
  await flush();

  // Should revert back to previously selected value
  expect(input).toHaveValue('Two');
});
