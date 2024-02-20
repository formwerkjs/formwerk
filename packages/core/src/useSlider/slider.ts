import { InjectionKey, MaybeRefOrGetter, computed, onBeforeUnmount, provide, ref, toValue } from 'vue';
import { useLabel } from '@core/composables/useLabel';
import { AriaLabelableProps, Orientation } from '@core/types/common';
import { uniqId, withRefCapture } from '@core/utils/common';
import { toNearestMultipleOf } from '@core/utils/math';
import { useSyncModel } from '@core/composables/useModelSync';

export interface SliderProps {
  label?: MaybeRefOrGetter<string>;

  orientation?: MaybeRefOrGetter<Orientation>;
  modelValue?: MaybeRefOrGetter<number | number[]>;
  min?: MaybeRefOrGetter<number>;
  max?: MaybeRefOrGetter<number>;

  step?: MaybeRefOrGetter<number>;
}

export type Coordinate = { x: number; y: number };

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
   * Gets the slider current orientation.
   */
  getOrientation(): Orientation;

  /**
   * Gets the value for a given page position.
   */
  getValueForPagePosition(position: Coordinate): number;
}

export interface SliderContext {
  registerThumb(ctx: ThumbContext): SliderRegistration;
}

export const SliderInjectionKey: InjectionKey<SliderContext> = Symbol('Slider');

export function useSlider(props: SliderProps) {
  const inputId = uniqId();
  const trackRef = ref<HTMLElement>();
  const thumbs = ref<ThumbContext[]>([]);
  const sliderValue = computed(() => {
    if (thumbs.value.length <= 1) {
      return thumbs.value[0]?.getCurrentValue() || 0;
    }

    return thumbs.value.map(t => t.getCurrentValue());
  });

  useSyncModel({
    model: sliderValue,
    modelName: 'modelValue',
    onModelPropUpdated: value => {
      const arr = Array.isArray(value) ? value : [value];
      thumbs.value.forEach((t, idx) => {
        if (idx in arr) {
          t.setValue(arr[idx] || 0);
        }
      });
    },
  });

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

  const trackProps = computed(() => {
    const isVertical = toValue(props.orientation) === 'vertical';

    return withRefCapture(
      {
        style: { 'container-type': isVertical ? 'size' : 'inline-size', position: 'relative' },
        onMousedown(e: MouseEvent) {
          if (!trackRef.value) {
            return;
          }

          const targetValue = getValueForPagePosition({ x: e.clientX, y: e.clientY });
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
  });

  function getValueForPagePosition({ x, y }: Coordinate) {
    if (!trackRef.value) {
      return 0;
    }

    const orientation = toValue(props.orientation) || 'horizontal';
    const rect = trackRef.value.getBoundingClientRect();
    const percent = orientation === 'horizontal' ? (x - rect.left) / rect.width : (y - rect.top) / rect.height;

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
      getOrientation: () => toValue(props.orientation) || 'horizontal',
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
    sliderValue,
  };
}
