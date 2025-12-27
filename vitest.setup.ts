if (typeof window !== 'undefined') {
  // Provide a minimal shim for browser mode.
  if (!('process' in globalThis)) {
    // @ts-expect-error - intentional global shim for tests
    globalThis.process = { env: { NODE_ENV: 'test' } };
  }
}
