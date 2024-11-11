import { flush } from '@test-utils/index';
import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useOptionGroup } from './useOptionGroup';
import { useOption } from './useOption';
import { defineComponent } from 'vue';

test('should not have a11y errors', async () => {
  await render({
    setup() {
      const label = 'Field';
      const { groupProps, labelProps } = useOptionGroup({
        label,
      });

      return {
        groupProps,
        labelProps,
        label,
      };
    },
    template: `
      <div data-testid="fixture" v-bind="groupProps">
        <div v-bind="labelProps">{{ label }}</div>
      </div>
    `,
  });

  await flush();
  vi.useRealTimers();
  expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
  vi.useFakeTimers();
});

test('disabling a group disables all options', async () => {
  const Option = defineComponent({
    setup() {
      const { optionProps } = useOption({ label: 'Option', value: '' });

      return {
        optionProps,
      };
    },
    template: `
      <div v-bind="optionProps">
        <div>Option</div>
      </div>
    `,
  });

  await render({
    components: {
      Option,
    },
    setup() {
      const label = 'Field';
      const { groupProps, labelProps } = useOptionGroup({
        label,
        disabled: true,
      });

      return {
        groupProps,
        labelProps,
        label,
      };
    },
    template: `
      <div data-testid="fixture" v-bind="groupProps">
        <div v-bind="labelProps">{{ label }}</div>
        <Option />
        <Option />
        <Option />
      </div>
    `,
  });

  await flush();
  await expect(screen.getAllByRole('option')).toHaveLength(3);
  for (const option of screen.getAllByRole('option')) {
    expect(option).toHaveAttribute('aria-disabled', 'true');
  }
});
