import { renderSetup } from '@test-utils/renderSetup';
import { useRadio } from './useRadio';

test('warns if no radio group is present', async () => {
  const warn = vi.spyOn(console, 'warn');
  renderSetup(() => useRadio({ label: 'Radio', value: 'test' }));
  // In browser mode this can be logged more than once due to render/setup behavior,
  // so assert on the content rather than exact call count.
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('A Radio component must be a part of a Radio Group'));
  warn.mockRestore();
});
