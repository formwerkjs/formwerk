import { renderSetup } from '@test-utils/renderSetup';
import { useSliderThumb } from './useSliderThumb';

test('warns if no slider exists in context', async () => {
  const warn = vi.spyOn(console, 'warn');
  renderSetup(() => useSliderThumb({}));
  // In browser mode this can be logged more than once due to render/setup behavior,
  // so assert on the content rather than exact call count.
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('A Thumb must be used within a slider component'));
  warn.mockRestore();
});
