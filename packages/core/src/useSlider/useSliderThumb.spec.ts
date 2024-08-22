import { renderSetup } from '@test-utils/renderSetup';
import { useSliderThumb } from './useSliderThumb';

test('warns if no slider exists in context', async () => {
  const warn = vi.spyOn(console, 'warn');
  await renderSetup(() => useSliderThumb({}));
  expect(warn).toHaveBeenCalledOnce();
});
