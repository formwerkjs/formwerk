import 'vitest-axe/extend-expect';
import 'vitest-dom/extend-expect';

if (typeof window !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
}
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
