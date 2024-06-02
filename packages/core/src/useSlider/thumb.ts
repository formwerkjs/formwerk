import { Ref, computed, inject, ref, toValue } from 'vue';
import { SliderContext, SliderInjectionKey, ThumbContext } from './slider';
import { withRefCapture } from '../utils/common';
import { useFieldValue } from '../composables/useFieldValue';
import { Direction, Reactivify } from '../types';

export interface SliderThumbProps {
  label?: string;
  modelValue?: number;
}

const mockSlider: () => SliderContext = () => ({
  registerThumb: () => ({
    getThumbRange: () => ({ min: 0, max: 100 }),
    getSliderRange: () => ({ min: 0, max: 100 }),
    getSliderStep: () => 1,
    getSliderLabelProps: () => ({}),
    getValueForPagePosition: () => 0,
    getOrientation: () => 'horizontal',
    getInlineDirection: () => 'ltr',
  }),
});

const PAGE_KEY_MULTIPLIER = 10;

export function useSliderThumb(props: Reactivify<SliderThumbProps>, elementRef?: Ref<HTMLElement>) {
  const thumbRef = elementRef || ref<HTMLElement>();
  const isDragging = ref(false);
  const { fieldValue } = useFieldValue(toValue(props.modelValue) ?? 0);

  const thumbContext: ThumbContext = {
    focus() {
      thumbRef.value?.focus();
    },
    getCurrentValue() {
      return fieldValue.value || 0;
    },
    setValue,
  };

  function clampValue(value: number) {
    const { max, min } = slider.getThumbRange();

    return Math.min(Math.max(value, min), max);
  }

  function setValue(value: number) {
    fieldValue.value = clampValue(value);
  }

  const slider = inject(SliderInjectionKey, mockSlider, true).registerThumb(thumbContext);

  const thumbProps = computed(() => {
    const range = slider.getThumbRange();
    const ownLabel = toValue(props.label);

    return withRefCapture(
      {
        tabindex: '0',
        'aria-label': ownLabel ?? undefined,
        ...(ownLabel ? {} : slider.getSliderLabelProps()),
        'aria-valuemin': range.min,
        'aria-valuemax': range.max,
        'aria-valuenow': fieldValue.value || 0,
        onKeydown,
        onMousedown,
        style: getPositionStyle(),
      },
      thumbRef,
    );
  });

  function getPositionStyle() {
    const value = fieldValue.value || 0;
    const { min, max } = slider.getSliderRange();
    const dir = slider.getInlineDirection();
    let percent = ((value - min) / (max - min)) * 100;
    const orientation = slider.getOrientation();
    if (dir === 'rtl' || orientation === 'vertical') {
      percent = 1 - percent;
    }

    const inlineBound = dir === 'rtl' ? 'right' : 'left';

    const positionProp = orientation === 'vertical' ? 'bottom' : inlineBound;
    const translateX = orientation === 'vertical' ? '0' : `calc(${percent}cqw - 50%)`;
    const translateY = orientation === 'vertical' ? `calc(${percent}cqh - 50%)` : '0';

    return {
      position: 'absolute',
      [positionProp]: '0',
      willChange: 'transform',
      transform: `translate3d(${translateX}, ${translateY}, 0)`,
    };
  }

  function increment(multiple: number = 1) {
    const nextValue = (fieldValue.value || 0) + slider.getSliderStep() * multiple;
    setValue(nextValue);
  }

  function decrement(multiple: number = 1) {
    const nextValue = (fieldValue.value || 0) - slider.getSliderStep() * multiple;
    setValue(nextValue);
  }

  const keyMap: Record<Direction, { incrKeys: string[]; decrKeys: string[] }> = {
    ltr: { incrKeys: ['ArrowRight', 'ArrowUp'], decrKeys: ['ArrowLeft', 'ArrowDown'] },
    rtl: { incrKeys: ['ArrowLeft', 'ArrowUp'], decrKeys: ['ArrowRight', 'ArrowDown'] },
  };

  function onKeydown(e: KeyboardEvent) {
    const { incrKeys, decrKeys } = keyMap[slider.getInlineDirection()];

    if (decrKeys.includes(e.key)) {
      e.preventDefault();
      decrement();

      return;
    }

    if (incrKeys.includes(e.key)) {
      e.preventDefault();
      increment();

      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setValue(slider.getSliderRange().min);

      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setValue(slider.getSliderRange().max);

      return;
    }

    if (e.key === 'PageUp') {
      e.preventDefault();
      increment(PAGE_KEY_MULTIPLIER);

      return;
    }

    if (e.key === 'PageDown') {
      e.preventDefault();
      decrement(PAGE_KEY_MULTIPLIER);

      return;
    }
  }

  function onMousedown(e: MouseEvent) {
    if (e.button !== 0) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    thumbRef.value?.focus();

    document.addEventListener('mousemove', onMousemove);
    document.addEventListener('mouseup', onMouseup);
    isDragging.value = true;
  }

  function onMousemove(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setValue(slider.getValueForPagePosition({ x: e.clientX, y: e.clientY }));
  }

  function onMouseup() {
    document.removeEventListener('mousemove', onMousemove);
    document.removeEventListener('mouseup', onMouseup);
    isDragging.value = false;
  }

  return {
    thumbProps,
    currentValue: fieldValue,
    isDragging,
  };
}
