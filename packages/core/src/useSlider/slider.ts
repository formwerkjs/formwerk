import { InjectionKey, MaybeRefOrGetter, Ref, computed, onBeforeUnmount, provide, ref, shallowRef, toValue } from 'vue';
import { useLabel } from '@core/composables/useLabel';
import { AriaLabelableProps, Orientation } from '@core/types/common';
import { uniqId } from '@core/utils/common';

export interface SliderProps {
  label?: MaybeRefOrGetter<string>;

  orientation?: MaybeRefOrGetter<Orientation>;
  modelValue?: MaybeRefOrGetter<number>;
  min?: MaybeRefOrGetter<number>;
  max?: MaybeRefOrGetter<number>;

  step?: MaybeRefOrGetter<number>;
}

export interface ThumbContext {
  focus(): void;
  getCurrentValue(): number;
}

export interface ValueRange {
  min: number;
  max: number;
}

export interface SliderRegistration {
  /**
   * Gets the available range of values for the thumb that this registration is associated with.
   */
  getThumbRange(): ValueRange;

  /**
   * Gets the range for the slider.
   */
  getSliderRange(): ValueRange;

  /**
   * Gets the step value for the slider.
   */
  getSliderStep(): number;

  /**
   * Gets the props labelling the slider.
   */
  getSliderLabelProps(): AriaLabelableProps;
}

export interface SliderContext {
  registerThumb(ctx: ThumbContext): SliderRegistration;
}

export const SliderInjectionKey: InjectionKey<SliderContext> = Symbol('Slider');

export function useSlider(props: SliderProps, trackElRef?: Ref<HTMLElement>) {
  const inputId = uniqId();
  const trackRef = trackElRef || ref<HTMLElement>();
  const thumbs = shallowRef<ThumbContext[]>([]);

  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: trackRef,
    handleClick: () => thumbs.value[0]?.focus(),
  });

  const groupProps = computed(() => ({
    ...labelledByProps.value,
    id: inputId,
    role: 'group',
    'aria-orientation': toValue(props.orientation) || 'horizontal',
  }));

  function registerThumb(ctx: ThumbContext) {
    thumbs.value.push(ctx);
    const getSliderRange = () => ({ min: toValue(props.min) || 0, max: toValue(props.max) || 100 });
    // Each thumb range is dependent on the previous and next thumb
    // i.e it's min cannot be less than the previous thumb's value
    // and it's max cannot be more than the next thumb's value
    const reg: SliderRegistration = {
      getThumbRange() {
        const { min: absoluteMin, max: absoluteMax } = getSliderRange();

        const idx = thumbs.value.indexOf(ctx);
        const nextThumb = thumbs.value[idx + 1];
        const prevThumb = thumbs.value[idx - 1];

        const min = prevThumb ? prevThumb.getCurrentValue() : absoluteMin;
        const max = nextThumb ? nextThumb.getCurrentValue() : absoluteMax;

        return { min, max, absoluteMin, absoluteMax };
      },
      getSliderRange,
      getSliderStep() {
        return toValue(props.step) || 1;
      },
      getSliderLabelProps() {
        return labelledByProps.value;
      },
    };

    onBeforeUnmount(() => unregisterThumb(ctx));

    return reg;
  }

  function unregisterThumb(ctx: ThumbContext) {
    // TODO: Not very efficient
    thumbs.value = thumbs.value.filter(t => t !== ctx);
  }

  // TODO: IDK what this does
  const outputProps = {
    'aria-live': 'off',
  };

  provide(SliderInjectionKey, { registerThumb });

  return {
    trackRef,
    labelProps,
    groupProps,
    outputProps,
  };
}
