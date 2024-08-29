import { fireEvent, render, screen } from '@testing-library/vue';
import { usePopoverController } from './usePopoverController';
import { nextTick, ref } from 'vue';

// The matches query doesn't seem to be supported
test.skip('opens/closes the popover when `isOpen` changes', async () => {
  await render({
    setup() {
      const popoverRef = ref<HTMLElement>();
      const { isOpen } = usePopoverController(popoverRef);

      return {
        isOpen,
        popoverRef,
      };
    },
    template: `<div ref="popoverRef" data-testid="popover" popover>visible</div> <button @click="isOpen = !isOpen">Toggle</button`,
  });

  expect(screen.getByTestId('popover').matches(':popover-open')).toBe(false);
  await fireEvent.click(screen.getByText('Toggle'));
  expect(screen.getByTestId('popover').matches(':popover-open')).toBe(true);
  await fireEvent.click(screen.getByText('Toggle'));
  expect(screen.getByTestId('popover').matches(':popover-open')).toBe(false);
});

const createEvent = (state: boolean) => {
  const evt = new Event('toggle');
  (evt as any).newState = state ? 'open' : 'closed';

  return evt;
};

test('Syncs isOpen when the toggle event is fired', async () => {
  await render({
    setup() {
      const popoverRef = ref<HTMLElement>();
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

  expect(screen.getByTestId('state')).toHaveTextContent('false');
  await fireEvent(screen.getByTestId('popover'), createEvent(true));
  await nextTick();
  expect(screen.getByTestId('state')).toHaveTextContent('true');
  await fireEvent(screen.getByTestId('popover'), createEvent(false));
  await nextTick();
  expect(screen.getByTestId('state')).toHaveTextContent('false');
});

test('No ops if state match', async () => {
  await render({
    setup() {
      const popoverRef = ref<HTMLElement>();
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

  expect(screen.getByTestId('state')).toHaveTextContent('false');
  await fireEvent(screen.getByTestId('popover'), createEvent(false));
  await nextTick();
  expect(screen.getByTestId('state')).toHaveTextContent('false');
});
