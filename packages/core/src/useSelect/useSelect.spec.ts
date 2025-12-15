import { defineComponent, Ref } from 'vue';
import { useSelect } from './useSelect';
import { useOption } from '../useOption';
import { useOptionGroup } from '../useOptionGroup';
import { page } from 'vitest/browser';
import { isMac } from '../utils/platform';
import { expectNoA11yViolations } from '@test-utils/index';

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function windowKeyDown(init: KeyboardEventInit & { code?: string }) {
  window.dispatchEvent(new KeyboardEvent('keydown', init));
}

function windowKeyUp(init: KeyboardEventInit & { code?: string }) {
  window.dispatchEvent(new KeyboardEvent('keyup', init));
}

async function keyDown(target: ReturnType<typeof page.getByRole>, init: KeyboardEventInit & { code?: string }) {
  (await target.element()).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
}

async function click(target: ReturnType<typeof page.getByRole>, init?: MouseEventInit) {
  if (init) {
    (await target.element()).dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));
    return;
  }

  (await target.element()).click();
}

function createSelect() {
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
        listBoxProps,
        errorMessageProps,
        descriptionProps,
        fieldValue,
        selectedOptions,
        selectedOption,
        errorMessage,
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
        listBoxProps,
        errorMessageProps,
        descriptionProps,
        getValue,
        groups,
        options,
        selectedOptions,
        selectedOption,
        errorMessage,
      };
    },
    template: `
        <div data-testid="select">
          <label v-bind="labelProps">{{ label }}</label>

          <div v-bind="triggerProps">
            {{ fieldValue || 'Select here' }}
          </div>

          <div v-bind="listBoxProps" popover>
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
            {{ errorMessage }}
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
  return page.getByRole('combobox');
}

describe('keyboard features for a single select', () => {
  function renderSelect(opts?: { label: string; disabled?: boolean }[]) {
    page.render({
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
        await keyDown(getSelect(), { code: 'Space' });
        await expect.element(getSelect()).toHaveAttribute('aria-expanded', 'true');
      },
    };
  }

  test('Pressing space should open the listbox and have focus on first option', async () => {
    renderSelect();

    await keyDown(getSelect(), { code: 'Space' });
    await expect.element(getSelect()).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByRole('option').nth(0)).toHaveFocus();
  });

  test('Pressing Enter should open the listbox and have focus on first option', async () => {
    renderSelect();

    await keyDown(getSelect(), { code: 'Enter' });
    await expect.element(getSelect()).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByRole('option').nth(0)).toHaveFocus();
  });

  test('Clicking the trigger should open the listbox and have focus on first option', async () => {
    renderSelect();

    await click(getSelect());
    await expect.element(getSelect()).toHaveAttribute('aria-expanded', 'true');
    await expect.element(page.getByRole('option').nth(0)).toHaveFocus();
  });

  test('Pressing ArrowDown should Move focus through the options and stays at the bottom', async () => {
    await renderSelect().open();

    const listbox = page.getByRole('listbox');
    await keyDown(listbox, { code: 'ArrowDown' });
    await expect.element(page.getByRole('option').nth(1)).toHaveFocus();
    await keyDown(listbox, { code: 'ArrowDown' });
    await expect.element(page.getByRole('option').nth(2)).toHaveFocus();
    await keyDown(listbox, { code: 'ArrowDown' });
    await expect.element(page.getByRole('option').nth(2)).toHaveFocus();
  });

  test('Pressing End should Move focus to the last option', async () => {
    await renderSelect().open();
    const listbox = page.getByRole('listbox');

    await keyDown(listbox, { code: 'End' });
    await expect.element(page.getByRole('option').nth(2)).toHaveFocus();
  });

  test('Pressing Home should Move focus to the first option', async () => {
    await renderSelect().open();
    const listbox = page.getByRole('listbox');

    await keyDown(listbox, { code: 'End' });
    await expect.element(page.getByRole('option').nth(2)).toHaveFocus();
    await keyDown(listbox, { code: 'Home' });
    await expect.element(page.getByRole('option').nth(0)).toHaveFocus();
  });

  test('Pressing PageUp should Move focus to the first option', async () => {
    await renderSelect().open();
    const listbox = page.getByRole('listbox');

    await keyDown(listbox, { code: 'End' });
    await expect.element(page.getByRole('option').nth(2)).toHaveFocus();
    await keyDown(listbox, { code: 'PageUp' });
    await expect.element(page.getByRole('option').nth(0)).toHaveFocus();
  });

  test('Pressing PageDown should Move focus to the first option', async () => {
    await renderSelect().open();
    const listbox = page.getByRole('listbox');

    await keyDown(listbox, { code: 'PageDown' });
    await expect.element(page.getByRole('option').nth(2)).toHaveFocus();
  });

  test('Pressing ArrowUp should Move focus through the options backwards and stays at the top', async () => {
    await renderSelect().open();
    const listbox = page.getByRole('listbox');

    await keyDown(listbox, { code: 'End' });
    await expect.element(page.getByRole('option').nth(2)).toHaveFocus();
    await keyDown(listbox, { code: 'ArrowUp' });
    await expect.element(page.getByRole('option').nth(1)).toHaveFocus();
    await keyDown(listbox, { code: 'ArrowUp' });
    await expect.element(page.getByRole('option').nth(0)).toHaveFocus();
    await keyDown(listbox, { code: 'ArrowUp' });
    await expect.element(page.getByRole('option').nth(0)).toHaveFocus();
  });

  test('tabbing should close the listbox', async () => {
    await renderSelect().open();
    const listbox = page.getByRole('listbox');

    await expect.element(getSelect()).toHaveAttribute('aria-expanded', 'true');
    await keyDown(listbox, { code: 'Tab' });
    await expect.element(getSelect()).toHaveAttribute('aria-expanded', 'false');
  });

  test('Finds most suitable option when typing', async () => {
    await renderSelect([{ label: 'Egypt' }, { label: 'Estonia' }, { label: 'Ethiopia' }]).open();

    const listbox = page.getByRole('listbox');
    await keyDown(listbox, { key: 'E' });
    await keyDown(listbox, { key: 'T' });
    await expect.element(page.getByRole('option').nth(2)).toHaveFocus();
    await sleep(1000);
    await keyDown(listbox, { key: 'E' });
    await keyDown(listbox, { key: 'S' });
    await expect.element(page.getByRole('option').nth(1)).toHaveFocus();
  });

  test('Pressing Space should select the focused option', async () => {
    await renderSelect().open();

    const option = page.getByRole('option').nth(1);
    await keyDown(option, { code: 'Space' });
    await expect.element(getSelect()).toHaveTextContent('Two');
  });

  test('Pressing Space on a disabled option should not select it', async () => {
    await renderSelect([{ label: 'One' }, { label: 'Two', disabled: true }, { label: 'Three' }]).open();

    const option = page.getByRole('option').nth(1);
    await keyDown(option, { code: 'Space' });
    await expect.element(getSelect()).toHaveTextContent('Select here');
  });

  test('Pressing Enter should select the focused option', async () => {
    await renderSelect().open();

    const option = page.getByRole('option').nth(1);
    await keyDown(option, { code: 'Enter' });
    await expect.element(getSelect()).toHaveTextContent('Two');
  });

  test('Pressing Enter on a disabled option should not select it', async () => {
    await renderSelect([{ label: 'One' }, { label: 'Two', disabled: true }, { label: 'Three' }]).open();

    const option = page.getByRole('option').nth(1);
    await keyDown(option, { code: 'Enter' });
    await expect.element(getSelect()).toHaveTextContent('Select here');
  });

  test('Clicking should select the clicked option', async () => {
    await renderSelect().open();

    const option = page.getByRole('option').nth(2);
    await click(option);
    await expect.element(getSelect()).toHaveTextContent('Three');
  });

  test('Clicking a disabled option should not select the clicked option', async () => {
    await renderSelect([{ label: 'One' }, { label: 'Two', disabled: true }, { label: 'Three' }]).open();

    const option = page.getByRole('option').nth(1);
    await click(option);
    await expect.element(getSelect()).toHaveTextContent('Select here');
  });
});

describe('keyboard features for a multi select', () => {
  function renderSelect(opts?: { label: string; disabled?: boolean }[]) {
    page.render({
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
        await keyDown(getSelect(), { code: 'Space' });
        await expect.element(getSelect()).toHaveAttribute('aria-expanded', 'true');
      },
    };
  }

  test('Shift + ArrowDown should select the next option', async () => {
    await renderSelect().open();

    const listbox = page.getByRole('listbox');
    windowKeyDown({ code: 'ShiftLeft' });
    await keyDown(listbox, { code: 'ArrowDown', shiftKey: true });
    await expect.element(page.getByRole('option').nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'true');
    windowKeyUp({ code: 'ShiftLeft' });
  });

  test('Shift + ArrowUp should select the previous option', async () => {
    await renderSelect().open();

    const listbox = page.getByRole('listbox');
    await keyDown(listbox, { code: 'End' });
    windowKeyDown({ code: 'ShiftLeft' });
    await keyDown(listbox, { code: 'ArrowUp', shiftKey: true });
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(2)).toHaveAttribute('aria-checked', 'false');
    windowKeyUp({ code: 'ShiftLeft' });
  });

  test('Shift + Home should select all options from the first to the toggled option', async () => {
    await renderSelect().open();

    const listbox = page.getByRole('listbox');
    await keyDown(listbox, { code: 'ArrowDown' });
    windowKeyDown({ code: 'ShiftLeft' });
    await keyDown(listbox, { code: 'Home' });
    await expect.element(page.getByRole('option').nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'true');
    windowKeyUp({ code: 'ShiftLeft' });
  });

  test('Shift + PageUp should select all options from the first to the toggled option', async () => {
    await renderSelect().open();

    const listbox = page.getByRole('listbox');
    await keyDown(listbox, { code: 'ArrowDown' });
    windowKeyDown({ code: 'ShiftLeft' });
    await keyDown(listbox, { code: 'PageUp' });
    await expect.element(page.getByRole('option').nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'true');
    windowKeyUp({ code: 'ShiftLeft' });
  });

  test('Shift + End should select all options from the first to the toggled option', async () => {
    await renderSelect().open();

    const listbox = page.getByRole('listbox');
    await keyDown(listbox, { code: 'ArrowDown' });
    windowKeyDown({ code: 'ShiftLeft' });
    await keyDown(listbox, { code: 'End' });
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(2)).toHaveAttribute('aria-checked', 'true');
    windowKeyUp({ code: 'ShiftLeft' });
  });

  test('Shift + PageDown should select all options from the first to the toggled option', async () => {
    await renderSelect().open();

    const listbox = page.getByRole('listbox');
    await keyDown(listbox, { code: 'ArrowDown' });
    windowKeyDown({ code: 'ShiftLeft' });
    await keyDown(listbox, { code: 'PageDown' });
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(2)).toHaveAttribute('aria-checked', 'true');
    windowKeyUp({ code: 'ShiftLeft' });
  });

  test('Control + A should select all options', async () => {
    await renderSelect().open();

    const listbox = page.getByRole('listbox');
    const modifier = isMac() ? 'MetaLeft' : 'ControlLeft';
    windowKeyDown({ code: modifier });
    await keyDown(listbox, { code: 'KeyA' });
    await expect.element(page.getByRole('option').nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(2)).toHaveAttribute('aria-checked', 'true');

    await keyDown(listbox, { code: 'KeyA' });
    await expect.element(page.getByRole('option').nth(0)).toHaveAttribute('aria-checked', 'false');
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'false');
    await expect.element(page.getByRole('option').nth(2)).toHaveAttribute('aria-checked', 'false');
    windowKeyUp({ code: modifier });
  });

  test('Click + Shift should do a contiguous selection', async () => {
    await renderSelect([
      { label: 'One' },
      { label: 'Two' },
      { label: 'Three' },
      { label: 'Four' },
      { label: 'Five' },
    ]).open();

    const option2 = page.getByRole('option').nth(2);
    const option4 = page.getByRole('option').nth(4);

    await click(option2);
    windowKeyDown({ code: 'ShiftLeft' });
    await click(option4);

    await expect.element(page.getByRole('option').nth(0)).toHaveAttribute('aria-checked', 'false');
    await expect.element(page.getByRole('option').nth(1)).toHaveAttribute('aria-checked', 'false');
    await expect.element(page.getByRole('option').nth(2)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(3)).toHaveAttribute('aria-checked', 'true');
    await expect.element(page.getByRole('option').nth(4)).toHaveAttribute('aria-checked', 'true');
    windowKeyUp({ code: 'ShiftLeft' });
  });
});

describe('selection state', () => {
  function renderSelect(select: any, opts?: { label: string; disabled?: boolean }[]) {
    page.render({
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
        await keyDown(getSelect(), { code: 'Space' });
        await expect.element(getSelect()).toHaveAttribute('aria-expanded', 'true');
      },
      async select(index: number) {
        await click(page.getByRole('option').nth(index));
      },
    };
  }

  test('selectedOption should reflect the currently selected option in single select', async () => {
    const MySelect = createSelect();
    const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

    const sl = renderSelect(MySelect, options);
    await sl.open();
    await sl.select(1);

    await expect
      .poll(() => MySelect.getExposedState().selectedOption)
      .toEqual({
        id: expect.any(String),
        label: 'Two',
        value: { label: 'Two' },
      });
  });

  test('selectedOptions should reflect all selected options in multi select', async () => {
    const MySelect = createSelect();
    const options = [{ label: 'One' }, { label: 'Two' }, { label: 'Three' }];

    const sl = renderSelect(MySelect, options);

    // Select first and third options
    await sl.open();
    await sl.select(0);
    await sl.select(2);

    await expect
      .poll(() => MySelect.getExposedState().selectedOptions)
      .toEqual([
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

describe('a11y', () => {
  test('with options', async () => {
    page.render({
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

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  test('with groups', async () => {
    page.render({
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

    await expectNoA11yViolations('[data-testid="fixture"]');
  });
});
