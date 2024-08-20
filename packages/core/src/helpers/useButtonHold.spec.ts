import { fireEvent, render, screen } from '@testing-library/vue';
import { useButtonHold } from './useButtonHold';
import { flush } from '@test-utils/flush';
import { ref } from 'vue';

const TICK_RATE = 100;

test('detects when a button is held', async () => {
  const ticks = 3;
  const onHold = vi.fn();
  const onClick = vi.fn();
  await render({
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

  await flush();
  expect(onHold).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  await fireEvent.mouseDown(screen.getByText('Hello'));
  vi.advanceTimersByTime(ticks * TICK_RATE);
  await fireEvent.mouseUp(screen.getByText('Hello'));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onHold).toHaveBeenCalledTimes(ticks - 1);
});

test('default hold tick is 100', async () => {
  const ticks = 3;
  const onHold = vi.fn();
  const onClick = vi.fn();
  await render({
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

  await flush();
  expect(onHold).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  await fireEvent.mouseDown(screen.getByText('Hello'));
  vi.advanceTimersByTime(ticks * TICK_RATE);
  await fireEvent.mouseUp(screen.getByText('Hello'));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onHold).toHaveBeenCalledTimes(ticks - 1);
});

test('stops ticking when the button is disabled', async () => {
  const isDisabled = ref(false);
  const onHold = vi.fn();
  const onClick = vi.fn();
  await render({
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

  await flush();
  expect(onHold).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  await fireEvent.mouseDown(screen.getByText('Hello'));
  vi.advanceTimersByTime(2 * TICK_RATE);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onHold).toHaveBeenCalledTimes(1);
  isDisabled.value = true;
  vi.advanceTimersByTime(2 * TICK_RATE);
  await fireEvent.mouseUp(screen.getByText('Hello'));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onHold).toHaveBeenCalledTimes(1);
});

test('does not respond to multiple kicks while already holding', async () => {
  const onHold = vi.fn();
  const onClick = vi.fn();
  await render({
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

  await flush();
  expect(onHold).not.toHaveBeenCalled();
  expect(onClick).not.toHaveBeenCalled();
  await fireEvent.mouseDown(screen.getByText('Hello'));
  vi.advanceTimersByTime(2 * TICK_RATE);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onHold).toHaveBeenCalledTimes(1);
  await fireEvent.mouseDown(screen.getByText('Hello'));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onHold).toHaveBeenCalledTimes(1);
  await fireEvent.mouseUp(screen.getByText('Hello'));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onHold).toHaveBeenCalledTimes(1);
});
