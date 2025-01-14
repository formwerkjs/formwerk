import { configure } from '../config';
import { getDirection } from './getDirection';

test('gets the direction of a locale', () => {
  expect(getDirection('ar-EG')).toBe('rtl');
  expect(getDirection('en-US')).toBe('ltr');
});

test('warns if the direction was not recognized', () => {
  const warn = vi.spyOn(console, 'warn');
  expect(getDirection(null as any)).toBe('ltr');
  expect(warn).toHaveBeenCalledTimes(1);
  warn.mockRestore();
});

test('returns ltr if detectDirection is false', () => {
  configure({ detectDirection: false });
  expect(getDirection('ar-EG')).toBe('ltr');
  configure({ detectDirection: true });
});
