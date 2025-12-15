import flushPromises from 'flush-promises';
import { SCHEMA_BATCH_MS } from '../../core/src/constants';
import { vi } from 'vitest';

export async function flush() {
  await flushPromises();
  // Most suites now run in Vitest browser mode with real timers.
  // In that environment, `vi.advanceTimersByTime` throws unless fake timers are enabled.
  // This helper supports both:
  // - if fake timers are enabled: advance them
  // - otherwise: wait real time
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    vi.advanceTimersByTime(SCHEMA_BATCH_MS * 2);
  } catch {
    await new Promise<void>(r => setTimeout(r, SCHEMA_BATCH_MS * 2));
  }
  await flushPromises();
}
