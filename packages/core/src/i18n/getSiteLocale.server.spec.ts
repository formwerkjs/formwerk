// @vitest-environment node
import { getSiteLocale } from './getSiteLocale';
import { expect } from 'vitest';

test('test', () => {
  expect(typeof window).toBe('undefined');
  expect(getSiteLocale()).toBe('en-US');
});
