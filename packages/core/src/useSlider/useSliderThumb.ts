import { type CSSProperties, type Ref, computed, inject, ref, toValue } from 'vue';
import { SliderContext, SliderInjectionKey, ThumbRegistration } from './useSlider';
import { normalizeProps, useUniqId, warn, withRefCapture } from '../utils/common';
import { Reactivify } from '../types';
import { useSpinButton } from '../useSpinButton';
import { useLocale } from '../i18n';
import { FieldTypePrefixes, NOOP } from '../constants';
import { createDisabledContext } from '../helpers/createDisabledContext';

export interface SliderThumbProps {
  label?: string;
  modelValue?: number;
  disabled?: boolean;
}

export function useSliderThumb(_props: Reactivify<SliderThumbProps>, elementRef?: Ref<HTMLElement>) {
  const props = normalizeProps(_props);
  const thumbEl = elementRef || ref<HTMLElement>();
  const isDisabled = createDisabledContext(props.disabled);
  const isDragging = ref(false);
  const { direction } = useLocale();
  const id = useUniqId(FieldTypePrefixes.SliderThumb);

  const thumbContext: ThumbRegistration = {
    id,
    focus() {
      thumbEl.value?.focus();
    },
  };

  const mockSlider: () => SliderContext = () => ({
    useSliderThumbRegistration: () => ({
      getThumbRange: () => ({ min: 0, max: 100 }),
      getSliderRange: () => ({ min: 0, max: 100 }),
      getSliderStep: () => 1,
      getSliderLabelProps: () => ({}),
      getValueForPagePosition: () => 0,
      getRealThumbValue: () => 0,
      getOrientation: () => 'horizontal',
      getInlineDirection: () => direction.value,
      getIndex: () => 0,
      getThumbValue: () => 0,
      setThumbValue: NOOP,
      setTouched: NOOP,
      isDisabled: () => false,
      getAccessibleErrorProps: () => ({
        'aria-invalid': false,
        'aria-errormessage': undefined,
      }),
      __isMock: true,
    }),
  });

  const slider = inject(SliderInjectionKey, mockSlider, true).useSliderThumbRegistration(thumbContext);
  const thumbValue = computed(() => slider.getThumbValue());
  const thumbRealValue = computed(() => slider.getRealThumbValue());

  if ('__isMock' in slider) {
    warn(
      'A Thumb must be used within a slider component. Make sure you have called `useSlider` in a parent component.',
    );
  }

  const { spinButtonProps, applyClamp } = useSpinButton({
    current: thumbValue,
    disabled: isDisabled,
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
        tabindex: isDisabled.value ? '-1' : '0',
        role: 'slider',
        ...slider.getAccessibleErrorProps(),
        'aria-orientation': slider.getOrientation(),
        'aria-label': ownLabel ?? undefined,
        ...(ownLabel ? {} : slider.getSliderLabelProps()),
        ...spinButtonProps.value,
        onMousedown,
        style: getPositionStyle(),
      },
      thumbEl,
    );
  });

  function getPositionStyle(): CSSProperties {
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
    const translateX = orientation === 'vertical' ? '0' : `calc(${percent}cqw ${dir === 'rtl' ? '+' : '-'} 50%)`;
    const translateY = orientation === 'vertical' ? `calc(${percent}cqh + 50%)` : '0';

    return {
      position: 'absolute',
      [positionProp]: '0',
      willChange: 'translate',
      translate: `${translateX} ${translateY}`,
    };
  }

  function onMousedown(e: MouseEvent) {
    if (e.button !== 0) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    thumbEl.value?.focus();

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
    currentValue: thumbRealValue,
    isDragging,
    isDisabled,
    thumbEl,
  };
}
