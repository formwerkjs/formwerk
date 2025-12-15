import { render } from '@testing-library/vue';
import { useOptionGroup } from './useOptionGroup';
import { useOption } from '../useOption';
import { defineComponent } from 'vue';
import { page } from 'vitest/browser';
import { expectNoA11yViolations } from '@test-utils/index';

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

  render({
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

  const options = page.getByRole('option');
  await expect.element(options.nth(0)).toHaveAttribute('aria-disabled', 'true');
  await expect.element(options.nth(1)).toHaveAttribute('aria-disabled', 'true');
  await expect.element(options.nth(2)).toHaveAttribute('aria-disabled', 'true');
});

test('useOptionGroup should not have a11y errors', async () => {
  render({
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

  await expectNoA11yViolations('[data-testid="fixture"]');
});
