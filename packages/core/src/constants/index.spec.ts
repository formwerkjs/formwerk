import { FieldTypePrefixes } from '.';

test('Field Prefixes are unique', () => {
  const prefixes = Object.values(FieldTypePrefixes);
  const uniquePrefixes = new Set(prefixes);

  expect(uniquePrefixes.size).toBe(prefixes.length);
});
