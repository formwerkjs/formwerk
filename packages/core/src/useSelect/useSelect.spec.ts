import { defineComponent } from 'vue';
import { useSelect } from './useSelect';
import { useOption } from './useOption';
import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { flush } from '@test-utils/index';
import { useOptionGroup } from './useOptionGroup';

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
      const { groupProps } = useOptionGroup(all);

      return {
        ...all,
        groupProps,
      };
    },
    template: `
      <div v-bind="groupProps">
        <div v-bind="labelProps">{{ label }}</div>
        <slot />
      </div>
    `,
  });

  return defineComponent({
    components: { OptionItem: Option, OptionGroup },
    setup(props, { attrs }) {
      const all = { ...attrs, ...props } as any;
      const { labelProps, triggerProps, listBoxProps, errorMessageProps, descriptionProps, displayError, fieldValue } =
        useSelect(all);

      const getValue = (option: any) => option;

      return {
        ...all,
        fieldValue,
        labelProps,
        triggerProps,
        listBoxProps,
        errorMessageProps,
        descriptionProps,
        displayError,
        getValue,
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
                      :option="option"
                      :label="option.label"
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
                  :option="option"
                  :label="option.label"
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
