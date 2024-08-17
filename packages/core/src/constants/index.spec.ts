import { FieldTypePrefixes, NOOP } from '.';

test('Field Prefixes are unique', () => {
  const prefixes = Object.values(FieldTypePrefixes);
  const uniquePrefixes = new Set(prefixes);

  expect(uniquePrefixes.size).toBe(prefixes.length);
});

test('NOOP does nothing', () => {
  expect(NOOP.length).toBe(0);
  expect(NOOP()).toBeUndefined();
});
