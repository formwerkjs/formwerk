import { renderSetup } from '@test-utils/index';
import { useOption } from './useOption';
import { flush } from '@test-utils/index';
import { render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';

test('warns if no Selection or ListBox Context is provided', async () => {
  const warn = vi.spyOn(console, 'warn');
  await renderSetup(() => {
    return useOption({ label: 'Ayooo', option: '' });
  });

  expect(warn).toHaveBeenCalledTimes(2);

  warn.mockRestore();
});

test('should not have a11y errors', async () => {
  await render({
    setup() {
      const label = 'Field';
      const { optionProps } = useOption({ label, option: '' });

      return {
        optionProps,
        label,
      };
    },
    template: `
      <div data-testid="fixture" aria-label="box" role="listbox">
        <div v-bind="optionProps">
          <div>{{ label }}</div>
        </div>
      </div>
    `,
  });

  await flush();
  vi.useRealTimers();
  expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
  vi.useFakeTimers();
});
