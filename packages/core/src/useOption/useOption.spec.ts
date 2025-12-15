import { renderSetup } from '@test-utils/index';
import { useOption } from './useOption';
import { render } from '@testing-library/vue';
import { expectNoA11yViolations } from '@test-utils/index';

test('warns if no ListBox Context is provided', async () => {
  const warn = vi.spyOn(console, 'warn');
  renderSetup(() => {
    return useOption({ label: 'Ayooo', value: '' });
  });

  // In browser mode this can be logged more than once due to render/setup behavior,
  // so assert on the content rather than exact call count.
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('An option component must exist within a ListBox Context'));

  warn.mockRestore();
});

test('useOption should not have a11y errors', async () => {
  render({
    setup() {
      const label = 'Field';
      const { optionProps } = useOption({ label, value: '' });

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

  await expectNoA11yViolations('[data-testid="fixture"]');
});
