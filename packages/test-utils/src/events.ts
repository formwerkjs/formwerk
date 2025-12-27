import { page } from 'vitest/browser';

type Locator = ReturnType<typeof page.getByRole>;

/**
 * Dispatch an event on the element.
 *
 * @example
 * // Simple event by name
 * await dispatchEvent(getInput(), 'blur');
 *
 * // Event object
 * await dispatchEvent(getInput(), new KeyboardEvent('keydown', { code: 'Enter' }));
 *
 * // Keyboard event shorthand
 * await dispatchEvent.keyboard(getInput(), 'Enter');
 * await dispatchEvent.keyboard(getInput(), 'ArrowDown', 'keyup');
 */
async function dispatchEvent(target: Locator, event: Event | string) {
  const el = await target.element();
  const eventObj = typeof event === 'string' ? new Event(event, { bubbles: true }) : event;
  el.dispatchEvent(eventObj);
}

/**
 * Dispatch a keyboard event on the element.
 *
 * @param target - The element locator
 * @param code - The key code (e.g., 'Enter', 'ArrowDown', 'Tab')
 * @param type - The event type, defaults to 'keydown'
 */
dispatchEvent.keyboard = async function (target: Locator, code: string, type: 'keydown' | 'keyup' = 'keydown') {
  const el = await target.element();
  el.dispatchEvent(new KeyboardEvent(type, { bubbles: true, code, key: code }));
};

export { dispatchEvent };
