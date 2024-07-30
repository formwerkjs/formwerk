import { Ref, computed, inject, ref, toValue } from 'vue';
import { SliderContext, SliderInjectionKey, ThumbContext } from './slider';
import { normalizeProps, withRefCapture } from '../utils/common';
import { Reactivify } from '../types';
import { useSpinButton } from '../useSpinButton';
import { useLocale } from '../i18n/useLocale';
import { NOOP } from '../constants';

export interface SliderThumbProps {
  label?: string;
  modelValue?: number;
  disabled?: boolean;
}

export function useSliderThumb(_props: Reactivify<SliderThumbProps>, elementRef?: Ref<HTMLElement>) {
  const props = normalizeProps(_props);
  const thumbRef = elementRef || ref<HTMLElement>();
  const isDragging = ref(false);
  const { direction } = useLocale();

  const thumbContext: ThumbContext = {
    focus() {
      thumbRef.value?.focus();
    },
  };

  const mockSlider: () => SliderContext = () => ({
    registerThumb: () => ({
      getThumbRange: () => ({ min: 0, max: 100 }),
      getSliderRange: () => ({ min: 0, max: 100 }),
      getSliderStep: () => 1,
      getSliderLabelProps: () => ({}),
      getValueForPagePosition: () => 0,
      getOrientation: () => 'horizontal',
      getInlineDirection: () => direction.value,
      getIndex: () => 0,
      getThumbValue: () => 0,
      setThumbValue: NOOP,
      setTouched: NOOP,
      isDisabled: () => false,
    }),
  });

  const slider = inject(SliderInjectionKey, mockSlider, true).registerThumb(thumbContext);
  const thumbValue = computed(() => slider.getThumbValue());

  const { spinButtonProps, applyClamp } = useSpinButton({
    current: thumbValue,
    disabled: () => toValue(props.disabled) || slider.isDisabled(),
    orientation: 'both',
    min: () => slider.getThumbRange().min,
    max: () => slider.getThumbRange().max,
    step: () => slider.getSliderStep(),
    dir: () => slider.getInlineDirection(),
    onChange: next => {
      slider.setThumbValue(next);
      slider.setTouched(true);
    },
  });

  function setValue(value: number) {
    slider.setThumbValue(applyClamp(value));
  }

  const thumbProps = computed(() => {
    const ownLabel = toValue(props.label);

    return withRefCapture(
      {
        tabindex: '0',
        'aria-label': ownLabel ?? undefined,
        ...(ownLabel ? {} : slider.getSliderLabelProps()),
        ...spinButtonProps.value,
        onMousedown,
        style: getPositionStyle(),
      },
      thumbRef,
    );
  });

  function getPositionStyle() {
    const value = slider.getThumbValue();
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
    slider.setTouched(true);
  }

  return {
    thumbProps,
    currentValue: thumbValue,
    isDragging,
  };
}
