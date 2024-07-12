import { computed, toValue } from 'vue';
import { Numberish, Reactivify } from '../types';
import { toNearestMultipleOf } from '../utils/math';

export interface SpinButtonProps {
  min?: Numberish;
  max?: Numberish;
  step?: Numberish;

  incrementLabel?: string;
  decrementLabel?: string;

  readonly?: boolean;
  disabled?: boolean;

  current?: number;
  currentText?: string;

  onChange?(value: number): void;
}

const PAGE_KEY_MULTIPLIER = 10;

export function useSpinButton(props: Reactivify<SpinButtonProps, 'onChange'>) {
  const getStep = () => Number(toValue(props.step) || 1);
  const getMin = () => Number(toValue(props.min) ?? undefined);
  const getMax = () => Number(toValue(props.max) ?? undefined);

  function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || toValue(props.disabled) || toValue(props.readonly)) {
      return;
    }

    if (e.key === 'PageUp') {
      e.preventDefault();
      tryChange(getStep() * PAGE_KEY_MULTIPLIER);
      return;
    }

    if (e.key === 'PageDown') {
      e.preventDefault();
      tryChange(-getStep() * PAGE_KEY_MULTIPLIER);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
      return;
    }

    if (e.key === 'ArrowDown') {
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
    applyClamp,
    incrementButtonProps,
    decrementButtonProps,
    spinButtonProps,
  };
}
