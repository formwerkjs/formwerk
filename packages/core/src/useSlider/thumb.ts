import { MaybeRefOrGetter, Ref, computed, inject, ref, toValue } from 'vue';
import { SliderContext, SliderInjectionKey, ThumbContext } from './slider';
import { withRefCapture } from '@core/utils/common';
import { useFieldValue } from '@core/composables/useFieldValue';

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

  function setValue(value: number) {
    fieldValue.value = value;
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
    const percent = ((value - min) / (max - min)) * 100;

    const orientation = slider.getOrientation();
    const positionProp = orientation === 'vertical' ? 'top' : 'left';
    const translateX = orientation === 'vertical' ? '0' : `${percent}cqw`;
    const translateY = orientation === 'vertical' ? `${percent}cqh` : '0';

    return {
      position: 'absolute',
      [positionProp]: '0',
      willChange: 'transform',
      transform: `translate3d(${translateX}, ${translateY}, 0)`,
    };
  }

  function clampValue(value: number) {
    const { max, min } = slider.getThumbRange();

    return Math.min(Math.max(value, min), max);
  }

  function increment() {
    const nextValue = (fieldValue.value || 0) + slider.getSliderStep();
    setValue(clampValue(nextValue));
  }

  function decrement() {
    const nextValue = (fieldValue.value || 0) - slider.getSliderStep();
    setValue(clampValue(nextValue));
  }

  function onKeydown(e: KeyboardEvent) {
    const isHorizontal = slider.getOrientation() === 'horizontal';
    const incrKeys = isHorizontal ? ['ArrowRight', 'ArrowUp'] : ['ArrowDown', 'ArrowRight'];
    const decrKeys = isHorizontal ? ['ArrowLeft', 'ArrowDown'] : ['ArrowUp', 'ArrowLeft'];

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
    setValue(clampValue(slider.getValueForPagePosition({ x: e.clientX, y: e.clientY })));
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
