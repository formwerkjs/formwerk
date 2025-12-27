import { usePopoverController } from './usePopoverController';
import { shallowRef } from 'vue';
import { page } from 'vitest/browser';
import { expect } from 'vitest';
import { appRender } from '@test-utils/index';

// The matches query doesn't seem to be supported
test('opens/closes the popover when `isOpen` changes', async () => {
  appRender({
    setup() {
      const popoverRef = shallowRef<HTMLElement>();
      const { isOpen } = usePopoverController(popoverRef);

      return {
        isOpen,
        popoverRef,
      };
    },
    template: `<div ref="popoverRef" data-testid="popover" popover>visible</div> <button @click="isOpen = !isOpen" data-testid="toggle">Toggle</button>`,
  });

  await expect.element(page.getByTestId('popover')).not.toBeVisible();
  await page.getByTestId('toggle').click();
  await expect.element(page.getByTestId('popover')).toBeVisible();
  await page.getByTestId('toggle').click();
  await expect.element(page.getByTestId('popover')).not.toBeVisible();
});

const createEvent = (state: boolean) => {
  const evt = new Event('toggle');
  (evt as any).newState = state ? 'open' : 'closed';

  return evt;
};

test('Syncs isOpen when the toggle event is fired', async () => {
  appRender({
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
  await expect.element(page.getByTestId('state')).toHaveTextContent('true');
  ((await page.getByTestId('popover').element()) as HTMLElement).dispatchEvent(createEvent(false));
  await expect.element(page.getByTestId('state')).toHaveTextContent('false');
});

test('No ops if state match', async () => {
  appRender({
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
  await expect.element(page.getByTestId('state')).toHaveTextContent('false');
});
