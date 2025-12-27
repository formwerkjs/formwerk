import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    axeCheck: (selector?: string) => Promise<unknown[]>;
  }
}

export async function expectNoA11yViolations(scopeSelector: string = 'body') {
  const violations = await commands.axeCheck(scopeSelector);
  expect(violations).toEqual([]);
}
