import { isSSR } from '../../utils/common';

/**
 * Tries to guess the site locale based on a few strategies.
 */
export function getSiteLocale(): string {
  // If we are in SSR, we cannot know the site locale.
  // The user should provide it manually via `configure`.
  if (isSSR) {
    return 'en-US';
  }

  // HTML lang is very common way to define a site locale.
  // Other stuff like navigator and user settings do not reflect the site locale.
  // e.g: I can have a browser in English but I can be on a Spanish site.
  const lang = document.documentElement.lang;

  return lang || 'en-US';
}
