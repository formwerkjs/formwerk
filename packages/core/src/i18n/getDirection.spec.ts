import { getDirection } from './getDirection';

test('gets the direction of a locale', () => {
  expect(getDirection('ar-EG')).toBe('rtl');
  expect(getDirection('en-US')).toBe('ltr');
});

test('warns if the direction was not recognized', () => {
  const warn = vi.spyOn(console, 'warn');
  expect(getDirection(null)).toBe('ltr');
  expect(warn).toHaveBeenCalledTimes(1);
  warn.mockRestore();
});
