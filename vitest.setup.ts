import { afterEach } from 'vitest';
import { cleanupAppRender } from '@test-utils/index';

if (typeof window !== 'undefined') {
  // Provide a minimal shim for browser mode.
  if (!('process' in globalThis)) {
    // @ts-expect-error - intentional global shim for tests
    globalThis.process = { env: { NODE_ENV: 'test' } };
  }
}

// Global cleanup after each test
afterEach(() => {
  cleanupAppRender();
});
