import { flush } from '@test-utils/index';
import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { useOptionGroup } from './useOptionGroup';

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
