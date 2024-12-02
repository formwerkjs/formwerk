import {
  type CSSProperties,
  ComputedRef,
  type InjectionKey,
  computed,
  onBeforeUnmount,
  provide,
  ref,
  toValue,
} from 'vue';
import { useLabel, useErrorMessage, type ErrorableAttributes } from '../a11y';
import { AriaLabelableProps, Arrayable, Direction, Numberish, Orientation, Reactivify, StandardSchema } from '../types';
import {
  fromNumberish,
  isEqual,
  isNullOrUndefined,
  normalizeArrayable,
  normalizeProps,
  removeFirst,
  useUniqId,
  warn,
  withRefCapture,
} from '../utils/common';
import { toNearestMultipleOf } from '../utils/math';
import { useLocale } from '../i18n';
import { useFormField, exposeField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useInputValidity } from '../validation';

export interface SliderProps<TValue = number> {
  /**
   * The label text for the slider.
   */
  label: string;

  /**
   * The name attribute for the slider input.
   */
  name?: string;

  /**
   * The orientation of the slider (horizontal or vertical).
   */
  orientation?: Orientation;

  /**
   * The text direction of the slider (ltr or rtl).
   */
  dir?: Direction;

  /**
   * The v-model value of the slider.
   */
  modelValue?: Arrayable<TValue>;

  /**
   * The value attribute of the slider input.
   */
  value?: Arrayable<TValue>;

  /**
   * The minimum value allowed for the slider. Ignored if `options` is provided.
   */
  min?: Numberish;

  /**
   * The maximum value allowed for the slider. Ignored if `options` is provided.
   */
  max?: Numberish;

  /**
   * The step increment between values. Ignored if `options` is provided.
   */
  step?: Numberish;

  /**
   * Discrete values that the slider can accept.
   */
  options?: TValue[];

  /**
   * Whether the slider is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the slider is readonly.
   */
  readonly?: boolean;

  /**
   * Schema for slider validation.
   */
  schema?: StandardSchema<TValue>;
}

export type Coordinate = { x: number; y: number };

export interface ThumbRegistration {
  id: string;
  focus(): void;
}

export interface ValueRange {
  min: number;
  max: number;
}

interface ThumbMetadata {
  /**
   * The current value of the thumb.
   */
  value: number;
  /**
   * The percent of the slider that the thumb is at.
   */
  percent: number;
  /**
   * The minimum value of the slider.
   */
  min: number;
  /**
   * The maximum value of the slider.
   */
  max: number;
  /**
   * The percent of the slider that the thumb is at.
   */
  sliderPercent: number;
  /**
   * The minimum value of the slider.
   */
  sliderMin: number;
  /**
   * The maximum value of the slider.
   */
  sliderMax: number;
}

export interface SliderRegistration<TValue = number> {
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

  /**
   * Gets the inline direction of the slider.
   */
  getInlineDirection(): Direction;

  /**
   * Gets the current value of the thumb.
   */
  getThumbValue(): number;

  getRealThumbValue(): TValue;

  /**
   * Gets the index of the thumb.
   */
  getIndex(): number;

  /**
   * Sets the value of the thumb.
   */
  setThumbValue(value: number): void;

  setTouched(value: boolean): void;

  getAccessibleErrorProps(): ErrorableAttributes;
}

export interface SliderContext {
  useSliderThumbRegistration(ctx: ThumbRegistration): SliderRegistration<unknown>;
}

export const SliderInjectionKey: InjectionKey<SliderContext> = Symbol('Slider');

export function useSlider<TValue>(_props: Reactivify<SliderProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.Slider);
  const trackEl = ref<HTMLElement>();
  const thumbs = ref<ThumbRegistration[]>([]);
  const { direction } = useLocale();
  const field = useFormField<Arrayable<TValue | undefined>>({
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as TValue,
    disabled: props.disabled,
    schema: props.schema,
  });

  if (__DEV__) {
    checkValidProps(_props);
  }

  const { fieldValue, setValue, setTouched, isDisabled } = field;
  const isReadonly = () => toValue(props.readonly) ?? false;
  const isMutable = () => !isDisabled.value && !isReadonly();
  const { updateValidity } = useInputValidity({ field });
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: trackEl,
    handleClick: () => thumbs.value[0]?.focus(),
  });

  const { errorMessageProps, accessibleErrorProps } = useErrorMessage({
    inputId,
    errorMessage: field.errorMessage,
  });

  const groupProps = computed(() => ({
    ...labelledByProps.value,
    id: inputId,
    role: 'group',
    dir: toValue(props.dir),
  }));

  function getThumbValue(idx: number) {
    if (Array.isArray(fieldValue.value)) {
      return mapStopToNumber(fieldValue.value[idx]);
    }

    if (idx === 0) {
      return mapStopToNumber(fieldValue.value);
    }

    return undefined;
  }

  function mapNumberToStop(value: number): TValue {
    const stops = getOptions();

    return stops?.length ? stops[value] : (value as TValue);
  }

  function mapStopToNumber(stop: TValue | undefined): number | undefined {
    if (isNullOrUndefined(stop)) {
      return stop || undefined;
    }

    const stops = getOptions();
    if (stops?.length) {
      const idx = stops.findIndex(s => isEqual(s, stop));

      if (__DEV__) {
        if (idx === -1) {
          warn(`Could not find stop for value ${stop}`);
        }
      }

      return idx;
    }

    if (__DEV__) {
      if (typeof stop !== 'number') {
        warn(`Could not find stop for value ${stop}`);
      }
    }

    return stop as number;
  }

  function getOptions() {
    return toValue(props.options);
  }

  function setThumbValue(idx: number, value: number) {
    if (!isMutable()) {
      return;
    }

    if (thumbs.value.length <= 1) {
      setValue(mapNumberToStop(value));
      updateValidity();
      return;
    }

    const nextValue = normalizeArrayable(fieldValue.value).filter(v => !isNullOrUndefined(v));
    nextValue[idx] = mapNumberToStop(value);
    setValue(nextValue);
    updateValidity();
  }

  const trackProps = computed(() => {
    const isVertical = toValue(props.orientation) === 'vertical';

    return withRefCapture(
      {
        style: { 'container-type': isVertical ? 'size' : 'inline-size', position: 'relative' } as CSSProperties,
        onMousedown(e: MouseEvent) {
          if (!trackEl.value || !isMutable()) {
            return;
          }

          const targetValue = getValueForPagePosition({ x: e.clientX, y: e.clientY });
          const closest = thumbs.value.reduce(
            (candidate, curr, idx) => {
              const { min, max } = getThumbRange(curr);
              if (targetValue < min || targetValue > max) {
                return candidate;
              }

              const currentThumbValue = getThumbValue(idx);
              if (isNullOrUndefined(currentThumbValue)) {
                return candidate;
              }

              const diff = Math.abs(currentThumbValue - targetValue);

              return diff < candidate.diff ? { thumb: curr, diff, idx } : candidate;
            },
            { thumb: thumbs.value[0], idx: 0, diff: Infinity },
          );

          setThumbValue(closest.idx, targetValue);
          setTouched(true);
        },
      },
      trackEl,
    );
  });

  function getValueForPagePosition({ x, y }: Coordinate) {
    if (!trackEl.value) {
      return 0;
    }

    const orientation = toValue(props.orientation) || 'horizontal';
    const rect = trackEl.value.getBoundingClientRect();
    let percent = orientation === 'horizontal' ? (x - rect.left) / rect.width : (y - rect.top) / rect.height;
    if (toValue(props.dir) === 'rtl' || orientation === 'vertical') {
      percent = 1 - percent;
    }

    const { min, max } = getSliderRange();
    const value = percent * (max - min) + min;

    return toNearestMultipleOf(value, getSliderStep(), !!getOptions());
  }

  function getSliderRange() {
    const stops = getOptions();
    if (stops?.length) {
      return { min: 0, max: stops.length - 1 };
    }

    return { min: fromNumberish(props.min) ?? 0, max: fromNumberish(props.max) ?? 100 };
  }

  function getThumbRange(thumbCtx: ThumbRegistration) {
    const { min: absoluteMin, max: absoluteMax } = getSliderRange();

    const idx = thumbs.value.indexOf(thumbCtx);
    const nextThumb = getThumbValue(idx + 1);
    const prevThumb = getThumbValue(idx - 1);

    const min = prevThumb ?? absoluteMin;
    const max = nextThumb ?? absoluteMax;

    return { min, max, absoluteMin, absoluteMax };
  }

  function getSliderStep() {
    const stops = getOptions();
    if (stops?.length) {
      return 1;
    }

    return fromNumberish(props.step) ?? 1;
  }

  function useSliderThumbRegistration(ctx: ThumbRegistration) {
    const id = ctx.id;
    thumbs.value.push(ctx);

    onBeforeUnmount(() => {
      removeFirst(thumbs.value, reg => reg.id === id);
    });

    function getThumbIndex() {
      return thumbs.value.findIndex(t => t.id === id);
    }

    // Each thumb range is dependent on the previous and next thumb
    // i.e it's min cannot be less than the previous thumb's value
    // and it's max cannot be more than the next thumb's value
    const reg: SliderRegistration<TValue> = {
      getThumbRange: () => getThumbRange(ctx),
      getSliderRange,
      getSliderLabelProps() {
        return labelledByProps.value;
      },
      getSliderStep,
      getValueForPagePosition,
      getOrientation: () => toValue(props.orientation) || 'horizontal',
      getInlineDirection: () => toValue(props.dir) || direction.value,
      getIndex: getThumbIndex,
      getThumbValue: () => {
        const { absoluteMin } = getThumbRange(ctx);

        return getThumbValue(getThumbIndex()) ?? absoluteMin;
      },
      getRealThumbValue() {
        return mapNumberToStop(this.getThumbValue());
      },
      setThumbValue(value) {
        setThumbValue(getThumbIndex(), value);
      },
      setTouched,
      getAccessibleErrorProps: () => accessibleErrorProps.value,
    };

    return reg;
  }

  const outputProps = {
    'aria-live': 'off',
  };

  provide(SliderInjectionKey, { useSliderThumbRegistration });

  /**
   * Gets the metadata for a given thumb.
   */
  function useThumbMetadata(idx: number): ComputedRef<ThumbMetadata> {
    return computed(() => {
      const value = getThumbValue(idx);
      if (isNullOrUndefined(value)) {
        return {
          value: 0,
          percent: 0,
          min: 0,
          max: 0,
          sliderPercent: 0,
          sliderMin: 0,
          sliderMax: 0,
        };
      }

      const { min, max, absoluteMax, absoluteMin } = getThumbRange(thumbs.value[idx]);
      const absolutePercent = (value - absoluteMin) / (absoluteMax - absoluteMin);
      const percent = (value - min) / (max - min);

      return {
        value,
        percent,
        min,
        max,
        sliderPercent: absolutePercent,
        sliderMin: absoluteMin,
        sliderMax: absoluteMax,
      } satisfies ThumbMetadata;
    });
  }

  return exposeField(
    {
      /**
       * Reference to the track element.
       */
      trackEl,
      /**
       * Props for the label element.
       */
      labelProps,
      /**
       * Props for the root element for the slider component.
       */
      groupProps,
      /**
       * Props for the output element.
       */
      outputProps,
      /**
       * Props for the track element.
       */
      trackProps,
      /**
       * Props for the error message element.
       */
      errorMessageProps,
      useThumbMetadata,
    },
    field,
  );
}

function checkValidProps(props: Reactivify<SliderProps<unknown>, 'schema'>) {
  const isDiscreteStepsPresent = !!props.options;
  const isMinMaxPresent = !!props.min || !!props.max;
  const isStepPresent = props.step ?? false;

  if (isDiscreteStepsPresent && isMinMaxPresent) {
    warn('Cannot use discrete steps with min/max, the min/max will be ignored.');
  }

  if (isDiscreteStepsPresent && isStepPresent) {
    warn('Cannot use discrete steps with explicit step value, the step value will be ignored.');
  }
}
