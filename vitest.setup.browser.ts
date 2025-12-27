import { vi } from 'vitest';

// Browser mode runs in a real browser, so keep real timers by default.
// Note: `vitest-dom/extend-expect` relies on Node internals and can't be used in browser mode.
// We only stub a couple of DOM APIs that might be missing in some environments.
if (typeof window !== 'undefined') {
  // Provide a minimal shim for browser mode.
  if (!('process' in globalThis)) {
    // @ts-expect-error - intentional global shim for tests
    globalThis.process = { env: { NODE_ENV: 'test' } };
  }

  Element.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
}
