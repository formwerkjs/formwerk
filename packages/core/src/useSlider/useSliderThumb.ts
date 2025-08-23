import { type CSSProperties, type Ref, computed, inject, ref, toValue, shallowRef } from 'vue';
import { SliderContext, SliderInjectionKey, ThumbRegistration } from './useSliderControl';
import { normalizeProps, useUniqId, warn, useCaptureProps } from '../utils/common';
import { Reactivify } from '../types';
import { useSpinButton } from '../useSpinButton';
import { useLocale } from '../i18n';
import { FieldTypePrefixes, NOOP } from '../constants';
import { createDisabledContext } from '../helpers/createDisabledContext';

export interface SliderThumbProps<TValue = number> {
  /**
   * The label text for the slider thumb.
   */
  label?: string;

  /**
   * The v-model value of the slider thumb.
   */
  modelValue?: TValue;

  /**
   * Whether the slider thumb is disabled.
   */
  disabled?: boolean;

  /**
   * A function to format the value text of the slider thumb. Used for setting the `aria-valuetext` attribute.
   */
  formatValue?: (value: TValue) => string;
}

export function useSliderThumb<TValue = number>(
  _props: Reactivify<SliderThumbProps<TValue>, 'formatValue'>,
  elementRef?: Ref<HTMLElement>,
) {
  const props = normalizeProps(_props, ['formatValue']);
  const thumbEl = elementRef || shallowRef<HTMLElement>();
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
  const thumbRealValue = computed(() => slider.getRealThumbValue() as TValue);

  if ('__isMock' in slider) {
    warn(
      'A Thumb must be used within a slider component. Make sure you have called `useSlider` in a parent component.',
    );
  }

  const textValue = computed(() => {
    const realValue = slider.getRealThumbValue() as TValue;

    return props.formatValue ? props.formatValue(realValue) : String(realValue);
  });

  const { spinButtonProps, applyClamp } = useSpinButton({
    current: thumbValue,
    disabled: isDisabled,
    orientation: 'both',
    currentText: textValue,
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

  const thumbProps = useCaptureProps(() => {
    const ownLabel = toValue(props.label);

    return {
      tabindex: isDisabled.value ? '-1' : '0',
      role: 'slider',
      ...slider.getAccessibleErrorProps(),
      'aria-orientation': slider.getOrientation(),
      'aria-label': ownLabel ?? undefined,
      ...(ownLabel ? {} : slider.getSliderLabelProps()),
      ...spinButtonProps.value,
      onMousedown: onPointerdown,
      onTouchstart: onPointerdown,
      style: getPositionStyle(),
    };
  }, thumbEl);

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

  function onPointerdown(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    thumbEl.value?.focus();

    if ('button' in e && e.button !== 0) {
      return;
    }

    if ('touches' in e && e.touches.length > 1) {
      return;
    }

    if (e.type === 'touchstart') {
      document.addEventListener('touchmove', onPointermove);
      document.addEventListener('touchend', onPointerup);
    } else {
      document.addEventListener('mousemove', onPointermove);
      document.addEventListener('mouseup', onPointerup);
    }

    isDragging.value = true;
  }

  function onPointermove(e: MouseEvent | TouchEvent) {
    const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;

    e.preventDefault();
    e.stopPropagation();
    setValue(slider.getValueForPagePosition({ x: clientX, y: clientY }));
  }

  function onPointerup(e: MouseEvent | TouchEvent) {
    if (e.type === 'touchend') {
      document.removeEventListener('touchmove', onPointermove);
      document.removeEventListener('touchend', onPointerup);
    } else {
      document.removeEventListener('mousemove', onPointermove);
      document.removeEventListener('mouseup', onPointerup);
    }

    isDragging.value = false;
    slider.setTouched(true);
  }

  return {
    /**
     * Props for the thumb element.
     */
    thumbProps,
    /**
     * The current value of the thumb.
     */
    currentValue: thumbRealValue,
    /**
     * Whether the thumb is currently being dragged.
     */
    isDragging,
    /**
     * Whether the thumb is disabled.
     */
    isDisabled,
    /**
     * Reference to the thumb element.
     */
    thumbEl,
    /**
     * The current formatted value of the thumb.
     */
    currentText: textValue,
  };
}
