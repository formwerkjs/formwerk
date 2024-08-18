import { renderSetup } from '@test-utils/renderSetup';
import { useRadio } from './useRadio';

test('warns if no radio group is present', async () => {
  const warn = vi.spyOn(console, 'warn');
  await renderSetup(() => useRadio({ label: 'Radio', value: 'test' }));
  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});
