import { defineComponent, Ref } from 'vue';
import { useSelect } from './useSelect';
import { useOption } from '../useOption';
import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { flush } from '@test-utils/index';
import { useOptionGroup } from '../useOptionGroup';

function createSelect() {
  const Option = defineComponent({
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

  const OptionGroup = defineComponent({
    setup(props, { attrs }) {
      const all = { ...attrs, ...props } as any;
      const { groupProps, labelProps } = useOptionGroup(all);

      return {
        ...all,
        groupProps,
        labelProps,
      };
    },
    template: `
      <div v-bind="groupProps">
        <div v-bind="labelProps">{{ label }}</div>
        <slot />
      </div>
    `,
  });

  let exposedSelectedOptions: Ref<any[]>;
  let exposedSelectedOption: Ref<any>;

  const component = defineComponent({
    components: { OptionItem: Option, OptionGroup },
    setup(props, { attrs }) {
      const all = { ...attrs, ...props } as any;
      const {
        labelProps,
        triggerProps,
        popupProps,
        errorMessageProps,
        descriptionProps,
        displayError,
        fieldValue,
        selectedOptions,
        selectedOption,
      } = useSelect(all);

      exposedSelectedOptions = selectedOptions;
      exposedSelectedOption = selectedOption;

      const groups = all.groups || null;
      const options = all.options || null;

      const getValue = (option: any) => option;

      return {
        ...all,
        fieldValue,
        labelProps,
        triggerProps,
        popupProps,
        errorMessageProps,
        descriptionProps,
        displayError,
        getValue,
        groups,
        options,
        selectedOptions,
        selectedOption,
      };
    },
    template: `
        <div data-testid="select">
          <label v-bind="labelProps">{{ label }}</label>

          <div v-bind="triggerProps">
            {{ fieldValue || 'Select here' }}
          </div>

          <div v-bind="popupProps" popover>
            <slot>
              <template v-if="groups">
                <OptionGroup v-for="group in groups" :key="group.label" :label="group.label">
                  <slot name="group" :options="group.items">
                    <OptionItem
                      v-for="(option, idx) in group.items"
                      :key="(getValue?.(option)) ?? idx"
                      :value="option"
                      :label="option.label"
                      :disabled="!!option.disabled"
                    >
                      <slot name="option" :option="option">
                        {{ option.label }}
                      </slot>
                    </OptionItem>
                  </slot>
                </OptionGroup>
              </template>

              <template v-else-if="options">
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
            {{ displayError() }}
          </span>
        </div>
    `,
  });

  component.getExposedState = () => ({
    selectedOptions: exposedSelectedOptions.value,
    selectedOption: exposedSelectedOption.value,
  });

  return component;
}

function getSelect() {
  return screen.getByRole('combobox');
}

describe('should not have a11y errors', () => {
  test('with options', async () => {
    await render({
      components: {
        MySelect: createSelect(),
      },
      setup() {
        const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

        return { options };
      },
      template: `
        <div data-testid="fixture">
          <MySelect label="Field" :options="options" />
        </div>
      `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  test('with groups', async () => {
    await render({
      components: {
        MySelect: createSelect(),
      },
      setup() {
        const groups = [
          {
            label: 'Group 1',
            items: [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }],
          },
          {
            label: 'Group 2',
            items: [{ label: 'Four' }, { label: 'Five' }, { label: 'Six' }],
          },
        ];

        return { groups };
      },
      template: `
        <div data-testid="fixture">
          <MySelect label="Field" :groups="groups" />
        </div>
        `,
    });

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });
});

describe('keyboard features for a single select', () => {
  async function renderSelect(opts?: { label: string; disabled?: boolean }[]) {
    await render({
      components: {
        MySelect: createSelect(),
      },
      setup() {
        const options = opts || [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

        return { options };
      },
      template: `
        <div data-testid="fixture">
          <MySelect label="Field" :options="options" />
        </div>
      `,
    });

    return {
      async open() {
        await fireEvent.keyDown(getSelect(), { code: 'Space' });
        await flush();
      },
    };
  }

  test('Pressing space should open the listbox and have focus on first option', async () => {
    await renderSelect();

    await fireEvent.keyDown(getSelect(), { code: 'Space' });
    await flush();
    expect(getSelect()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')[0]).toHaveFocus();
  });

  test('Pressing Enter should open the listbox and have focus on first option', async () => {
    await renderSelect();

    await fireEvent.keyDown(getSelect(), { code: 'Enter' });
    await flush();
    expect(getSelect()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')[0]).toHaveFocus();
  });

  test('Clicking the trigger should open the listbox and have focus on first option', async () => {
    await renderSelect();

    await fireEvent.click(getSelect());
    await flush();
    expect(getSelect()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')[0]).toHaveFocus();
  });

  test('Pressing ArrowDown should Move focus through the options and stays at the bottom', async () => {
    await (await renderSelect()).open();

    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { code: 'ArrowDown' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toHaveFocus();
    await fireEvent.keyDown(listbox, { code: 'ArrowDown' });
    await flush();
    expect(screen.getAllByRole('option')[2]).toHaveFocus();
    await fireEvent.keyDown(listbox, { code: 'ArrowDown' });
    await flush();
    expect(screen.getAllByRole('option')[2]).toHaveFocus();
  });

  test('Pressing End should Move focus to the last option', async () => {
    await (await renderSelect()).open();
    const listbox = screen.getByRole('listbox');

    await fireEvent.keyDown(listbox, { code: 'End' });
    await flush();
    expect(screen.getAllByRole('option')[2]).toHaveFocus();
  });

  test('Pressing Home should Move focus to the first option', async () => {
    await (await renderSelect()).open();
    const listbox = screen.getByRole('listbox');

    await fireEvent.keyDown(listbox, { code: 'End' });
    await flush();
    expect(screen.getAllByRole('option')[2]).toHaveFocus();
    await fireEvent.keyDown(listbox, { code: 'Home' });
    await flush();
    expect(screen.getAllByRole('option')[0]).toHaveFocus();
  });

  test('Pressing PageUp should Move focus to the first option', async () => {
    await (await renderSelect()).open();
    const listbox = screen.getByRole('listbox');

    await fireEvent.keyDown(listbox, { code: 'End' });
    await flush();
    expect(screen.getAllByRole('option')[2]).toHaveFocus();
    await fireEvent.keyDown(listbox, { code: 'PageUp' });
    await flush();
    expect(screen.getAllByRole('option')[0]).toHaveFocus();
  });

  test('Pressing PageDown should Move focus to the first option', async () => {
    await (await renderSelect()).open();
    const listbox = screen.getByRole('listbox');

    await fireEvent.keyDown(listbox, { code: 'PageDown' });
    await flush();
    expect(screen.getAllByRole('option')[2]).toHaveFocus();
  });

  test('Pressing ArrowUp should Move focus through the options backwards and stays at the top', async () => {
    await (await renderSelect()).open();
    const listbox = screen.getByRole('listbox');

    await fireEvent.keyDown(listbox, { code: 'End' });
    await fireEvent.keyDown(listbox, { code: 'ArrowUp' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toHaveFocus();
    await fireEvent.keyDown(listbox, { code: 'ArrowUp' });
    await flush();
    expect(screen.getAllByRole('option')[0]).toHaveFocus();
    await fireEvent.keyDown(listbox, { code: 'ArrowUp' });
    await flush();
    expect(screen.getAllByRole('option')[0]).toHaveFocus();
  });

  test('tabbing should close the listbox', async () => {
    await (await renderSelect()).open();
    const listbox = screen.getByRole('listbox');

    expect(getSelect()).toHaveAttribute('aria-expanded', 'true');
    await fireEvent.keyDown(listbox, { code: 'Tab' });
    await flush();
    expect(getSelect()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Finds most suitable option when typing', async () => {
    const renderedSelect = await renderSelect([{ label: 'Egypt' }, { label: 'Estonia' }, { label: 'Ethiopia' }]);
    await renderedSelect.open();

    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { key: 'E' });
    await fireEvent.keyDown(listbox, { key: 'T' });
    await flush();
    expect(screen.getAllByRole('option')[2]).toHaveFocus();
    await vi.advanceTimersByTime(1000);
    await fireEvent.keyDown(listbox, { key: 'E' });
    await fireEvent.keyDown(listbox, { key: 'S' });
    expect(screen.getAllByRole('option')[1]).toHaveFocus();
  });

  test('Pressing Space should select the focused option', async () => {
    await (await renderSelect()).open();

    await fireEvent.keyDown(screen.getAllByRole('option')[1], { code: 'Space' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  test('Pressing Space on a disabled option should not select it', async () => {
    await (await renderSelect([{ label: 'One' }, { label: 'Two', disabled: true }, { label: 'Three' }])).open();

    await fireEvent.keyDown(screen.getAllByRole('option')[1], { code: 'Space' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'false');
  });

  test('Pressing Enter should select the focused option', async () => {
    await (await renderSelect()).open();

    await fireEvent.keyDown(screen.getAllByRole('option')[1], { code: 'Enter' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  test('Pressing Enter on a disabled option should not select it', async () => {
    await (await renderSelect([{ label: 'One' }, { label: 'Two', disabled: true }, { label: 'Three' }])).open();

    await fireEvent.keyDown(screen.getAllByRole('option')[1], { code: 'Enter' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'false');
  });

  test('Clicking should select the clicked option', async () => {
    await (await renderSelect()).open();

    await fireEvent.click(screen.getAllByRole('option')[2]);
    await flush();
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');
  });

  test('Clicking a disabled option should not select the clicked option', async () => {
    await (await renderSelect([{ label: 'One' }, { label: 'Two', disabled: true }, { label: 'Three' }])).open();

    await fireEvent.click(screen.getAllByRole('option')[1]);
    await flush();
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'false');
  });
});

describe('keyboard features for a multi select', () => {
  async function renderSelect(opts?: { label: string; disabled?: boolean }[]) {
    await render({
      components: {
        MySelect: createSelect(),
      },
      setup() {
        const options = opts || [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

        return { options };
      },
      template: `
        <div data-testid="fixture">
          <MySelect label="Field" :multiple="true" :options="options" />
        </div>
      `,
    });

    return {
      async open() {
        await fireEvent.keyDown(getSelect(), { code: 'Space' });
        await flush();
      },
    };
  }

  test('Shift + ArrowDown should select the next option', async () => {
    await (await renderSelect()).open();

    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { code: 'ShiftLeft' });
    await fireEvent.keyDown(listbox, { code: 'ArrowDown', shiftKey: true });
    await flush();
    expect(screen.getAllByRole('option')[0]).toBeChecked();
    expect(screen.getAllByRole('option')[1]).toBeChecked();
  });

  test('Shift + ArrowUp should select the previous option', async () => {
    await (await renderSelect()).open();

    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { code: 'End' });
    await fireEvent.keyDown(listbox, { code: 'ShiftLeft' });
    await fireEvent.keyDown(listbox, { code: 'ArrowUp' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toBeChecked();
    expect(screen.getAllByRole('option')[2]).not.toBeChecked();
  });

  test('Shift + Home should select all options from the first to the toggled option', async () => {
    await (await renderSelect()).open();

    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { code: 'ArrowDown' });
    await fireEvent.keyDown(listbox, { code: 'ShiftLeft' });
    await fireEvent.keyDown(listbox, { code: 'Home' });
    await flush();
    expect(screen.getAllByRole('option')[0]).toBeChecked();
    expect(screen.getAllByRole('option')[1]).toBeChecked();
  });

  test('Shift + PageUp should select all options from the first to the toggled option', async () => {
    await (await renderSelect()).open();

    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { code: 'ArrowDown' });
    await fireEvent.keyDown(listbox, { code: 'ShiftLeft' });
    await fireEvent.keyDown(listbox, { code: 'PageUp' });
    await flush();
    expect(screen.getAllByRole('option')[0]).toBeChecked();
    expect(screen.getAllByRole('option')[1]).toBeChecked();
  });

  test('Shift + End should select all options from the first to the toggled option', async () => {
    await (await renderSelect()).open();

    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { code: 'ArrowDown' });
    await fireEvent.keyDown(listbox, { code: 'ShiftLeft' });
    await fireEvent.keyDown(listbox, { code: 'End' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toBeChecked();
    expect(screen.getAllByRole('option')[2]).toBeChecked();
  });

  test('Shift + PageDown should select all options from the first to the toggled option', async () => {
    await (await renderSelect()).open();

    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { code: 'ArrowDown' });
    await fireEvent.keyDown(listbox, { code: 'ShiftLeft' });
    await fireEvent.keyDown(listbox, { code: 'PageDown' });
    await flush();
    expect(screen.getAllByRole('option')[1]).toBeChecked();
    expect(screen.getAllByRole('option')[2]).toBeChecked();
  });

  test('Control + A should select all options', async () => {
    await (await renderSelect()).open();

    const options = screen.getAllByRole('option');
    const listbox = screen.getByRole('listbox');
    await fireEvent.keyDown(listbox, { code: 'ControlLeft' });
    await fireEvent.keyDown(listbox, { code: 'KeyA' });
    await flush();
    expect(options[0]).toBeChecked();
    expect(options[1]).toBeChecked();
    expect(options[2]).toBeChecked();

    await fireEvent.keyDown(listbox, { code: 'KeyA' });
    await flush();
    expect(options[0]).not.toBeChecked();
    expect(options[1]).not.toBeChecked();
    expect(options[2]).not.toBeChecked();
  });

  test('Click + Shift should do a contiguous selection', async () => {
    await (
      await renderSelect([{ label: 'One' }, { label: 'Two' }, { label: 'Three' }, { label: 'Four' }, { label: 'Five' }])
    ).open();

    const options = screen.getAllByRole('option');
    const listbox = screen.getByRole('listbox');

    await fireEvent.click(screen.getAllByRole('option')[2]);
    await fireEvent.keyDown(listbox, { code: 'ShiftLeft' });
    await fireEvent.click(screen.getAllByRole('option')[4]);
    await flush();

    expect(options[0]).not.toBeChecked();
    expect(options[1]).not.toBeChecked();
    expect(options[2]).toBeChecked();
    expect(options[3]).toBeChecked();
    expect(options[4]).toBeChecked();
  });
});

describe('selection state', () => {
  async function renderSelect(select: any, opts?: { label: string; disabled?: boolean }[]) {
    await render({
      components: {
        MySelect: select,
      },
      setup() {
        const options = opts || [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

        return { options };
      },
      template: `
        <div data-testid="fixture">
          <MySelect label="Field" :multiple="true" :options="options" />
        </div>
      `,
    });

    return {
      async open() {
        await fireEvent.keyDown(getSelect(), { code: 'Space' });
        await flush();
      },
      async select(index: number) {
        await fireEvent.click(screen.getAllByRole('option')[index]);
        await flush();
      },
    };
  }

  test('selectedOption should reflect the currently selected option in single select', async () => {
    const MySelect = createSelect();
    const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

    const sl = await renderSelect(MySelect, options);
    await sl.open();
    await sl.select(1);
    await flush();

    expect(MySelect.getExposedState().selectedOption).toEqual({
      id: expect.any(String),
      label: 'Two',
      value: { label: 'Two' },
    });
  });

  test('selectedOptions should reflect all selected options in multi select', async () => {
    const MySelect = createSelect();
    const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

    const sl = await renderSelect(MySelect, options);

    // Select first and third options
    await sl.open();
    await sl.select(0);
    await sl.select(2);
    await flush();

    expect(MySelect.getExposedState().selectedOptions).toEqual([
      {
        id: expect.any(String),
        label: 'One',
        value: { label: 'One' },
      },
      {
        id: expect.any(String),
        label: 'Three',
        value: { label: 'Three' },
      },
    ]);
  });
});
