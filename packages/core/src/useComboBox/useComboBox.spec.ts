import { defineComponent, ref, Ref } from 'vue';
import { ComboBoxProps, useComboBox } from '.';
import { useOption } from '../useOption';
import { useDefaultFilter } from '../collections';
import { useForm } from '../useForm';
import { page, userEvent } from 'vitest/browser';
import { dispatchEvent, expectNoA11yViolations } from '@test-utils/index';

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
  return page.getByRole('combobox');
}

function getButton() {
  return page.getByRole('button');
}

describe('reset', () => {
  test('should set inputValue on reset with values', async () => {
    const MyComboBox = createComboBox();
    const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

    page.render({
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
    page.render({
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
        await getButton().click();
        await expect.element(getInput()).toHaveAttribute('aria-expanded', 'true');
      },
    };
  }

  test('Pressing ArrowDown should open the listbox', async () => {
    await renderComboBox();

    await getInput().click();
    await dispatchEvent.keyboard(getInput(), 'ArrowDown');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'true');
  });

  test('Pressing ArrowUp should open the listbox', async () => {
    await renderComboBox();

    await getInput().click();
    await dispatchEvent.keyboard(getInput(), 'ArrowUp');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'true');
  });

  test('Clicking the button should toggle the listbox', async () => {
    await renderComboBox();

    await getButton().click();
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'true');

    await getButton().click();
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Pressing Escape should close the listbox', async () => {
    const { open } = await renderComboBox();
    await open();

    await userEvent.keyboard('{Escape}');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Pressing Tab should close the listbox', async () => {
    const { open } = await renderComboBox();
    await open();

    await dispatchEvent.keyboard(getInput(), 'Tab');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Clicking an option should select it and close the listbox', async () => {
    const { open } = await renderComboBox();
    await open();

    await page.getByRole('option').nth(1).click();
    await expect.element(getInput()).toHaveValue('Two');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Pressing Enter on a focused option should select it', async () => {
    const { open } = await renderComboBox();
    await open();

    // Navigate to second option
    const input = getInput();
    await dispatchEvent.keyboard(input, 'ArrowDown');
    await dispatchEvent.keyboard(input, 'ArrowDown');
    // Press Enter to select it
    await dispatchEvent.keyboard(input, 'Enter');
    await expect.element(getInput()).toHaveValue('Two');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Should not select disabled options', async () => {
    const { open } = await renderComboBox([{ label: 'One' }, { label: 'Two', disabled: true }, { label: 'Three' }]);
    await open();

    const option = page.getByRole('option').nth(1);
    await dispatchEvent(option, 'click');
    await expect.element(getInput()).not.toHaveValue('Two');
  });

  test('Should revert to last selected value when blurred with invalid input', async () => {
    const { open } = await renderComboBox();
    await open();

    await page.getByRole('option').nth(1).click();
    await expect.element(getInput()).toHaveValue('Two');

    await getInput().fill('Random stuff');
    await expect.element(getInput()).toHaveValue('Random stuff');

    await dispatchEvent(getInput(), 'blur');
    await expect.element(getInput()).toHaveValue('Two');
  });

  test('Should select option when blurred with relatedTarget being an option', async () => {
    const { open } = await renderComboBox();
    await open();

    // Click on option to select it (blur with relatedTarget being an option)
    await page.getByRole('option').nth(1).click();

    await expect.element(getInput()).toHaveValue('Two');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('ArrowDown should highlight options in sequence and stop at last option', async () => {
    const { open } = await renderComboBox();
    await open();

    const options = page.getByRole('option');
    const input = getInput();

    await expect.element(options.nth(0)).not.toHaveAttribute('aria-selected');
    await expect.element(options.nth(1)).not.toHaveAttribute('aria-selected');
    await expect.element(options.nth(2)).not.toHaveAttribute('aria-selected');

    await dispatchEvent.keyboard(input, 'ArrowDown');
    await expect.element(options.nth(0)).toHaveAttribute('aria-selected', 'true');

    await dispatchEvent.keyboard(input, 'ArrowDown');
    await expect.element(options.nth(1)).toHaveAttribute('aria-selected', 'true');

    await dispatchEvent.keyboard(input, 'ArrowDown');
    await expect.element(options.nth(2)).toHaveAttribute('aria-selected', 'true');

    await dispatchEvent.keyboard(input, 'ArrowDown');
    await expect.element(options.nth(2)).toHaveAttribute('aria-selected', 'true');
  });

  test('ArrowUp should highlight options in reverse sequence and stop at first option', async () => {
    const { open } = await renderComboBox();
    await open();

    const options = page.getByRole('option');
    const input = getInput();

    await dispatchEvent.keyboard(input, 'End');
    await expect.element(options.nth(2)).toHaveAttribute('aria-selected', 'true');

    await dispatchEvent.keyboard(input, 'ArrowUp');
    await expect.element(options.nth(1)).toHaveAttribute('aria-selected', 'true');

    await dispatchEvent.keyboard(input, 'ArrowUp');
    await expect.element(options.nth(0)).toHaveAttribute('aria-selected', 'true');

    await dispatchEvent.keyboard(input, 'ArrowUp');
    await expect.element(options.nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('Home key should highlight first option', async () => {
    const { open } = await renderComboBox();
    await open();

    const options = page.getByRole('option');
    const input = getInput();

    await dispatchEvent.keyboard(input, 'End');
    await expect.element(options.nth(2)).toHaveAttribute('aria-selected', 'true');

    await dispatchEvent.keyboard(input, 'Home');
    await expect.element(options.nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  test('Should open menu when user starts typing', async () => {
    await renderComboBox();

    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
    await getInput().click();
    await userEvent.keyboard('T');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'true');
  });

  test('Enter key should select the highlighted option', async () => {
    const { open } = await renderComboBox();
    await open();

    const options = page.getByRole('option');
    const input = getInput();

    await dispatchEvent.keyboard(input, 'ArrowDown');
    await dispatchEvent.keyboard(input, 'ArrowDown');
    await expect.element(options.nth(1)).toHaveAttribute('aria-selected', 'true');

    await dispatchEvent.keyboard(input, 'Enter');
    await expect.element(getInput()).toHaveValue('Two');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Escape key should clear input value when menu is closed', async () => {
    const { open } = await renderComboBox();

    await open();
    await page.getByRole('option').nth(1).click();
    await expect.element(getInput()).toHaveValue('Two');

    await dispatchEvent.keyboard(getInput(), 'Escape');
    await expect.element(getInput()).toHaveValue('');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Should not change value when readonly', async () => {
    const { open } = await renderComboBox([{ label: 'One' }, { label: 'Two' }, { label: 'Three' }], { readonly: true });
    await open();

    await page.getByRole('option').nth(1).click();
    await expect.element(getInput()).not.toHaveValue('Two');
  });

  test('Should open menu when focused if openOnFocus is true', async () => {
    page.render({
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

    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'false');
    await dispatchEvent(getInput(), 'focus');
    await expect.element(getInput()).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('filtering', () => {
  test('should filter options based on input value', async () => {
    page.render({
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
    await input.fill('tw');
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(input).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByRole('option').nth(0)).toHaveTextContent('Two');
  });
});

describe('selection state', () => {
  test('selectedOption should reflect the currently selected option', async () => {
    const MyComboBox = createComboBox();
    const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

    page.render({
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

    await getButton().click();
    await page.getByRole('option').nth(1).click();

    await expect
      .poll(() => MyComboBox.getExposedState().selectedOption)
      .toEqual({
        id: expect.any(String),
        label: 'Two',
        value: { label: 'Two' },
      });
  });
});

describe('a11y', () => {
  test('with options', async () => {
    page.render({
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

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});

test('Should use onNewValue handler instead of reverting when provided', async () => {
  const onNewValueSpy = vi.fn(value => ({
    label: value + '!',
    value: value + '!',
  }));

  page.render({
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

  // Type some text that doesn't match any option - need to click first and use keyboard
  await input.click();
  await userEvent.keyboard('Something new');

  // Press Tab to trigger the new value handler (onNewValue is only called on Tab, not blur)
  await dispatchEvent.keyboard(input, 'Tab');

  // Should have called the handler with the input value
  expect(onNewValueSpy).toHaveBeenCalledWith('Something new');
  expect(onNewValueSpy).toHaveBeenCalledTimes(1);

  // Should show the modified value from onNewValue handler
  await expect.element(getInput()).toHaveValue('Something new!');
});

test('Can reject new values if onNewValue returns undefined', async () => {
  const onNewValueSpy = vi.fn(() => undefined);

  page.render({
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

  // Type some text that doesn't match any option - need to click first and use keyboard
  await input.click();
  await userEvent.keyboard('Something new');

  // Press Tab to trigger the new value handler (onNewValue is only called on Tab, not blur)
  await dispatchEvent.keyboard(input, 'Tab');

  // Should have called the handler with the input value
  expect(onNewValueSpy).toHaveBeenCalledWith('Something new');
  expect(onNewValueSpy).toHaveBeenCalledTimes(1);

  // Should show the modified value from onNewValue handler
  await expect.element(getInput()).not.toHaveValue('Something new!');
});

test('Should not accept new value on Enter when readonly', async () => {
  const MyComboBox = createComboBox();
  page.render({
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
  await getButton().click();
  await page.getByRole('option').nth(1).click();
  await expect.element(input).toHaveValue('Two');

  // Enable readonly
  await getButton().click();

  // Try to type something new
  await input.fill('Something new');

  // Try to accept the new value with Enter
  await userEvent.keyboard('{Enter}');

  // Should revert back to previously selected value
  await expect.element(input).toHaveValue('Two');
});
