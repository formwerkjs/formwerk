import { computed, toValue } from 'vue';
import { Direction, Numberish, Orientation2D, Reactivify } from '../types';
import { toNearestMultipleOf } from '../utils/math';

export interface SpinButtonProps {
  min?: Numberish;
  max?: Numberish;
  step?: Numberish;
  orientation?: Orientation2D;
  direction?: Direction;

  incrementLabel?: string;
  decrementLabel?: string;

  readonly?: boolean;
  disabled?: boolean;

  current?: number;
  currentText?: string;

  onChange?(value: number): void;
}

function getDirectionalStepKeys(orientation: Orientation2D, direction: Direction) {
  const horizontalDirKeys: Record<Direction, { incrKeys: string[]; decrKeys: string[] }> = {
    ltr: { incrKeys: ['ArrowRight'], decrKeys: ['ArrowLeft'] },
    rtl: { incrKeys: ['ArrowLeft'], decrKeys: ['ArrowRight'] },
  };

  const horizontalKeys = horizontalDirKeys[direction];
  const verticalKeys = { incrKeys: ['ArrowUp'], decrKeys: ['ArrowDown'] };
  const incrKeys: string[] = [];
  const decrKeys: string[] = [];

  if (orientation === 'horizontal' || orientation === 'both') {
    incrKeys.push(...horizontalKeys.incrKeys);
    decrKeys.push(...horizontalKeys.decrKeys);
  }

  if (orientation === 'vertical' || orientation === 'both') {
    incrKeys.push(...verticalKeys.incrKeys);
    decrKeys.push(...verticalKeys.decrKeys);
  }

  return { incrKeys, decrKeys };
}

export function useSpinButton(props: Reactivify<SpinButtonProps, 'onChange'>) {
  const getStep = () => Number(toValue(props.step) || 1);
  const getMin = () => Number(toValue(props.min) ?? undefined);
  const getMax = () => Number(toValue(props.max) ?? undefined);

  /**
   * Dynamically calculate the multiplier for the page up/down keys.
   */
  const getPageMultiplier = () => {
    const max = getMax();
    const min = getMin();

    if (Number.isNaN(max) || Number.isNaN(min)) {
      return 10;
    }

    return Math.max(Math.floor(Math.abs((max - min) / min)), getStep());
  };

  function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || toValue(props.disabled) || toValue(props.readonly)) {
      return;
    }

    if (e.key === 'PageUp') {
      e.preventDefault();
      pageIncrement();
      return;
    }

    if (e.key === 'PageDown') {
      e.preventDefault();
      pageDecrement();
      return;
    }

    const { incrKeys, decrKeys } = getDirectionalStepKeys(
      toValue(props.orientation) || 'both',
      toValue(props.direction) || 'ltr',
    );

    if (incrKeys.includes(e.key)) {
      e.preventDefault();
      increment();
      return;
    }

    if (decrKeys.includes(e.key)) {
      e.preventDefault();
      decrement();
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      incrementToMax();

      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      decrementToMin();
      return;
    }
  }

  function applyClamp(value: number) {
    const max = getMax();
    const min = getMin();

    if (!Number.isNaN(max) && value >= max) {
      return max;
    }

    if (!Number.isNaN(min) && value <= min) {
      return min;
    }

    return value;
  }

  function tryChange(diff: number) {
    const current = toValue(props.current) || 0;
    const step = getStep();
    const next = applyClamp(toNearestMultipleOf(current + diff, step));

    props.onChange?.(next);
  }

  function increment() {
    tryChange(getStep());
  }

  function decrement() {
    tryChange(-getStep());
  }

  function pageIncrement() {
    tryChange(getStep() * getPageMultiplier());
  }

  function pageDecrement() {
    tryChange(-getStep() * getPageMultiplier());
  }

  function incrementToMax() {
    const max = getMax();
    if (!Number.isNaN(max)) {
      props.onChange?.(max);
    }
  }

  function decrementToMin() {
    const min = getMin();
    if (!Number.isNaN(min)) {
      props.onChange?.(min);
    }
  }

  const incrementButtonProps = computed(() => {
    const max = getMax();
    const current = toValue(props.current);
    const isDisabled = !Number.isNaN(max) && current !== undefined && max <= current;

    return {
      onClick: increment,
      disabled: isDisabled,
      'aria-label': toValue(props.incrementLabel) || 'Increment',
    };
  });

  const decrementButtonProps = computed(() => {
    const min = getMin();
    const current = toValue(props.current);
    const isDisabled = !Number.isNaN(min) && current !== undefined && min >= current;

    return {
      onClick: decrement,
      disabled: isDisabled,
      'aria-label': toValue(props.decrementLabel) || 'Decrement',
    };
  });

  const spinButtonProps = computed(() => {
    return {
      onKeydown,
      'aria-valuenow': toValue(props.current),
      'aria-valuemin': toValue(props.min),
      'aria-valuemax': toValue(props.max),
      'aria-valuetext': toValue(props.currentText),
    };
  });

  return {
    increment,
    decrement,
    pageDecrement,
    pageIncrement,
    incrementToMax,
    decrementToMin,
    applyClamp,
    incrementButtonProps,
    decrementButtonProps,
    spinButtonProps,
  };
}
