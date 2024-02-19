import { InjectionKey, MaybeRefOrGetter, computed, onBeforeUnmount, provide, ref, shallowRef, toValue } from 'vue';
import { useLabel } from '@core/composables/useLabel';
import { AriaLabelableProps, Orientation } from '@core/types/common';
import { uniqId, withRefCapture } from '@core/utils/common';
import { toNearestMultipleOf } from '@core/utils/math';

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
  setValue(value: number): void;
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

  /**
   * Gets the value for a given page position.
   */
  getValueForPagePosition(pageX: number): number;
}

export interface SliderContext {
  registerThumb(ctx: ThumbContext): SliderRegistration;
}

export const SliderInjectionKey: InjectionKey<SliderContext> = Symbol('Slider');

export function useSlider(props: SliderProps) {
  const inputId = uniqId();
  const trackRef = ref<HTMLElement>();
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

  const trackProps = withRefCapture(
    {
      style: { 'container-type': 'inline-size', position: 'relative' },
      onMousedown(e: MouseEvent) {
        if (!trackRef.value) {
          return;
        }

        const targetValue = getValueForPagePosition(e.pageX);
        const closest = thumbs.value.reduce(
          (candidate, curr) => {
            const diff = Math.abs(curr.getCurrentValue() - targetValue);

            return diff < candidate.diff ? { thumb: curr, diff } : candidate;
          },
          { thumb: thumbs.value[0], diff: Infinity },
        );

        closest.thumb.setValue(targetValue);
      },
    },
    trackRef,
  );

  function getValueForPagePosition(pageX: number) {
    // TODO: use client Y/Height for vertical sliders
    if (!trackRef.value) {
      return 0;
    }

    const rect = trackRef.value.getBoundingClientRect();
    const percent = (pageX - rect.left) / rect.width;

    return toNearestMultipleOf(percent * (toValue(props.max) || 100), toValue(props.step) || 1);
  }

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
      getValueForPagePosition,
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
    trackProps,
  };
}
