import { render } from '@testing-library/vue';
import { usePopoverController } from './usePopoverController';
import { nextTick, shallowRef } from 'vue';
import { page } from 'vitest/browser';
import { expect } from 'vitest';

// The matches query doesn't seem to be supported
test.skip('opens/closes the popover when `isOpen` changes', async () => {
  render({
    setup() {
      const popoverRef = shallowRef<HTMLElement>();
      const { isOpen } = usePopoverController(popoverRef);

      return {
        isOpen,
        popoverRef,
      };
    },
    template: `<div ref="popoverRef" data-testid="popover" popover>visible</div> <button @click="isOpen = !isOpen">Toggle</button`,
  });

  // TODO: migrate this test once :popover-open can be asserted reliably in browser mode.
});

const createEvent = (state: boolean) => {
  const evt = new Event('toggle');
  (evt as any).newState = state ? 'open' : 'closed';

  return evt;
};

test('Syncs isOpen when the toggle event is fired', async () => {
  render({
    setup() {
      const popoverRef = shallowRef<HTMLElement>();
      const { isOpen } = usePopoverController(popoverRef);

      return {
        isOpen,
        popoverRef,
      };
    },
    template: `
      <div ref="popoverRef" data-testid="popover" popover>visible</div>
      <span data-testid="state">{{ isOpen }}</span>
    `,
  });

  await expect.element(page.getByTestId('state')).toHaveTextContent('false');
  ((await page.getByTestId('popover').element()) as HTMLElement).dispatchEvent(createEvent(true));
  await nextTick();
  await expect.element(page.getByTestId('state')).toHaveTextContent('true');
  ((await page.getByTestId('popover').element()) as HTMLElement).dispatchEvent(createEvent(false));
  await nextTick();
  await expect.element(page.getByTestId('state')).toHaveTextContent('false');
});

test('No ops if state match', async () => {
  render({
    setup() {
      const popoverRef = shallowRef<HTMLElement>();
      const { isOpen } = usePopoverController(popoverRef);

      return {
        isOpen,
        popoverRef,
      };
    },
    template: `
      <div ref="popoverRef" data-testid="popover" popover>visible</div>
      <span data-testid="state">{{ isOpen }}</span>
    `,
  });

  await expect.element(page.getByTestId('state')).toHaveTextContent('false');
  ((await page.getByTestId('popover').element()) as HTMLElement).dispatchEvent(createEvent(false));
  await nextTick();
  await expect.element(page.getByTestId('state')).toHaveTextContent('false');
});
