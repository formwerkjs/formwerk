import { describe, it, expect, vi } from 'vitest';
import { checkLocaleMismatch } from './checkLocaleMismatch';
import { getUserLocale } from './getUserLocale';
import { configure } from '../config';

vi.mock('./getUserLocale');

describe('checkLocaleMismatch', () => {
  it('should return no mismatch when locales match', () => {
    configure({ locale: 'en-US' });
    vi.mocked(getUserLocale).mockReturnValue('en-US');

    const result = checkLocaleMismatch();

    expect(result).toEqual({
      matches: true,
      configLocale: 'en-US',
      userLocale: 'en-US',
    });
  });

  it('should return mismatch when locales do not match', () => {
    configure({ locale: 'en-US' });
    vi.mocked(getUserLocale).mockReturnValue('fr-FR');

    const result = checkLocaleMismatch();

    expect(result).toEqual({
      matches: false,
      configLocale: 'en-US',
      userLocale: 'fr-FR',
    });
  });
});
