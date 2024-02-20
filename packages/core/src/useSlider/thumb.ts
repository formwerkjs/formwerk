import { MaybeRefOrGetter, Ref, computed, inject, ref, toValue } from 'vue';
import { SliderContext, SliderInjectionKey, ThumbContext } from './slider';
import { withRefCapture } from '@core/utils/common';
import { useFieldValue } from '@core/composables/useFieldValue';
import { Direction, Orientation } from '@core/types/common';

export interface SliderThumbProps {
  label?: MaybeRefOrGetter<string>;
  modelValue?: MaybeRefOrGetter<number>;
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

export function useSliderThumb(props: SliderThumbProps, elementRef?: Ref<HTMLElement>) {
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
    if (dir === 'rtl') {
      percent = 1 - percent;
    }

    const inlineBound = dir === 'rtl' ? 'right' : 'left';
    const orientation = slider.getOrientation();

    const positionProp = orientation === 'vertical' ? 'top' : inlineBound;
    const translateX = orientation === 'vertical' ? '0' : `${percent}cqw`;
    const translateY = orientation === 'vertical' ? `${percent}cqh` : '0';

    return {
      position: 'absolute',
      [positionProp]: '0',
      willChange: 'transform',
      transform: `translate3d(${translateX}, ${translateY}, 0)`,
    };
  }

  function increment() {
    const nextValue = (fieldValue.value || 0) + slider.getSliderStep();
    setValue(nextValue);
  }

  function decrement() {
    const nextValue = (fieldValue.value || 0) - slider.getSliderStep();
    setValue(nextValue);
  }

  const keyMap: Record<Direction, Record<Orientation, { incrKeys: string[]; decrKeys: string[] }>> = {
    ltr: {
      horizontal: { incrKeys: ['ArrowRight', 'ArrowUp'], decrKeys: ['ArrowLeft', 'ArrowDown'] },
      vertical: { incrKeys: ['ArrowDown', 'ArrowRight'], decrKeys: ['ArrowUp', 'ArrowLeft'] },
    },
    rtl: {
      horizontal: { incrKeys: ['ArrowLeft', 'ArrowUp'], decrKeys: ['ArrowRight', 'ArrowDown'] },
      vertical: { incrKeys: ['ArrowDown', 'ArrowLeft'], decrKeys: ['ArrowUp', 'ArrowRight'] },
    },
  };

  function onKeydown(e: KeyboardEvent) {
    const { incrKeys, decrKeys } = keyMap[slider.getInlineDirection()][slider.getOrientation()];

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
