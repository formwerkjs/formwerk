import 'vitest-axe/extend-expect';
import 'vitest-dom/extend-expect';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
