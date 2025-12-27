import { page } from 'vitest/browser';
import { useButtonHold } from './useButtonHold';
import { ref } from 'vue';
import { dispatchEvent, waitForTimeout, appRender } from '@test-utils/index';

const TICK_RATE = 100;

test('detects when a button is held', async () => {
  const ticks = 3;
  const onHold = vi.fn();
  const onClick = vi.fn();
  appRender({
    setup() {
      const btnProps = useButtonHold({
        onHoldTick: onHold,
        onClick,
        tickRate: TICK_RATE,
      });

      return {
        btnProps,
      };
    },
    template: `
      <button v-bind="btnProps" type="button">Hello</button>
    `,
  });

  expect(onHold).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  await dispatchEvent(page.getByRole('button', { name: 'Hello' }), 'mousedown');
  await waitForTimeout((ticks + 1) * TICK_RATE);
  await dispatchEvent(page.getByRole('button', { name: 'Hello' }), 'mouseup');

  await expect.poll(() => onClick).toHaveBeenCalledTimes(1);
  await expect.poll(() => onHold).toHaveBeenCalledTimes(ticks - 1);
});

test('default hold tick is 100', async () => {
  const ticks = 3;
  const onHold = vi.fn();
  const onClick = vi.fn();
  appRender({
    setup() {
      const btnProps = useButtonHold({
        onHoldTick: onHold,
        onClick,
      });

      return {
        btnProps,
      };
    },
    template: `
      <button v-bind="btnProps" type="button">Hello</button>
    `,
  });

  expect(onHold).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  await dispatchEvent(page.getByRole('button', { name: 'Hello' }), 'mousedown');
  await waitForTimeout((ticks + 1) * TICK_RATE);
  await dispatchEvent(page.getByRole('button', { name: 'Hello' }), 'mouseup');

  await expect.poll(() => onClick).toHaveBeenCalledTimes(1);
  await expect.poll(() => onHold).toHaveBeenCalledTimes(ticks - 1);
});

test('stops ticking when the button is disabled', async () => {
  const isDisabled = ref(false);
  const onHold = vi.fn();
  const onClick = vi.fn();
  appRender({
    setup() {
      const btnProps = useButtonHold({
        onHoldTick: onHold,
        onClick,
        disabled: isDisabled,
      });

      return {
        btnProps,
      };
    },
    template: `
      <button v-bind="btnProps" type="button">Hello</button>
    `,
  });

  expect(onHold).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  await dispatchEvent(page.getByRole('button', { name: 'Hello' }), 'mousedown');
  await waitForTimeout(3 * TICK_RATE);
  await dispatchEvent(page.getByRole('button', { name: 'Hello' }), 'mouseup');

  await expect.poll(() => onClick).toHaveBeenCalledTimes(1);
  await waitForTimeout(3 * TICK_RATE);
  await expect.poll(() => onHold).toHaveBeenCalledTimes(1);
  isDisabled.value = true;

  await dispatchEvent(page.getByRole('button', { name: 'Hello' }), 'mouseup');
  await expect.poll(() => onClick).toHaveBeenCalledTimes(1);
  await expect.poll(() => onHold).toHaveBeenCalledTimes(1);
});

test('does not respond to multiple kicks while already holding', async () => {
  const onHold = vi.fn();
  const onClick = vi.fn();
  appRender({
    setup() {
      const btnProps = useButtonHold({
        onHoldTick: onHold,
        onClick,
      });

      return {
        btnProps,
      };
    },
    template: `
      <button v-bind="btnProps" type="button">Hello</button>
    `,
  });

  expect(onHold).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  const btn = page.getByRole('button', { name: 'Hello' });
  await dispatchEvent(btn, 'mousedown');

  await expect.poll(() => onClick).toHaveBeenCalledTimes(1);
  await expect.poll(() => onHold).toHaveBeenCalledTimes(1);
  await dispatchEvent(btn, 'mousedown');
  await expect.poll(() => onClick).toHaveBeenCalledTimes(1);
  await expect.poll(() => onHold).toHaveBeenCalledTimes(1);

  await dispatchEvent(btn, 'mouseup');
  await expect.poll(() => onClick).toHaveBeenCalledTimes(1);
  await expect.poll(() => onHold).toHaveBeenCalledTimes(1);
});
