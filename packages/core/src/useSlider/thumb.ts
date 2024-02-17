import { MaybeRefOrGetter, Ref, computed, inject, ref, toValue } from 'vue';
import { SliderContext, SliderInjectionKey, ThumbContext } from './slider';
import { withRefCapture } from '@core/utils/common';
import { useFieldValue } from '@core/composables/useFieldValue';

export interface ThumbProps {
  label?: MaybeRefOrGetter<string>;
  modelValue?: MaybeRefOrGetter<number>;
}

const mockSlider: () => SliderContext = () => ({
  registerThumb: () => ({
    getThumbRange: () => ({ min: 0, max: 100 }),
    getSliderRange: () => ({ min: 0, max: 100 }),
    getSliderStep: () => 1,
    getSliderLabelProps: () => ({}),
  }),
});

export function useThumb(props: ThumbProps, elementRef?: Ref<HTMLElement>) {
  const thumbRef = elementRef || ref<HTMLElement>();
  const { fieldValue } = useFieldValue(toValue(props.modelValue) ?? 0);

  const thumbContext: ThumbContext = {
    focus() {
      thumbRef.value?.focus();
    },
    getCurrentValue() {
      return fieldValue.value || 0;
    },
  };

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

    return {
      position: 'absolute',
      left: `${percent}%`,
    };
  }

  function increment() {
    const { max } = slider.getThumbRange();
    const nextValue = (fieldValue.value || 0) + slider.getSliderStep();
    fieldValue.value = Math.min(nextValue, max);
  }

  function decrement() {
    const { min } = slider.getThumbRange();
    const nextValue = (fieldValue.value || 0) - slider.getSliderStep();
    fieldValue.value = Math.max(nextValue, min);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();

      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      increment();

      return;
    }
  }

  function onMousedown(e: MouseEvent) {
    e.preventDefault();
    thumbRef.value?.focus();
  }

  return { thumbProps };
}
