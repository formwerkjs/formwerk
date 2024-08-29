import { MaybeRefOrGetter, onBeforeUnmount, toValue } from 'vue';

export interface ButtonHoldOptions {
  onHoldTick: () => void;
  onClick: () => void;

  disabled?: MaybeRefOrGetter<boolean>;

  /**
   * Number of ticks per second, cannot be 0, defaults to 100.
   */
  tickRate?: number;
}

export function useButtonHold(opts: ButtonHoldOptions) {
  let interval: number;
  let timeout: number;
  let isTicking = false;

  function executeHoldTick() {
    if (toValue(opts.disabled)) {
      clearAll();
      return;
    }

    opts.onHoldTick();
  }

  function onMousedown() {
    if (isTicking || toValue(opts.disabled)) {
      return;
    }

    clearAll();
    opts.onClick();
    const tickRate = opts.tickRate || 100;
    document.addEventListener('mouseup', onMouseup, { once: true });
    timeout = window.setTimeout(() => {
      isTicking = true;
      interval = window.setInterval(executeHoldTick, tickRate);
    }, tickRate);
  }

  function onMouseup() {
    clearAll();
  }

  function clearAll() {
    window.clearInterval(interval);
    window.clearTimeout(timeout);
    isTicking = false;
  }

  const buttonHoldProps = {
    onMousedown,
  };

  onBeforeUnmount(() => {
    document.removeEventListener('mouseup', onMouseup);
    clearAll();
  });

  return buttonHoldProps;
}
