import { ControlProps, Maybe, Reactivify } from '../types';
import { isNullOrUndefined, normalizeProps, useUniqId, useCaptureProps } from '../utils/common';
import { computed, shallowRef, toValue } from 'vue';
import { exposeField, resolveControlField } from '../useFormField';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { useDateFormatter, useLocale } from '../i18n';
import { useTemporalStore } from './useTemporalStore';
import { ZonedDateTime } from '@internationalized/date';
import { useInputValidity } from '../validation';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { useConstraintsValidator } from '../validation/useConstraintsValidator';
import { merge } from '../../../shared/src';
import { Simplify } from 'type-fest';
import { useVModelProxy } from '../reactivity/useVModelProxy';

export type TimeFormatOptions = Simplify<
  Pick<Intl.DateTimeFormatOptions, 'hour' | 'minute' | 'second' | 'dayPeriod' | 'timeZone' | 'hour12'>
>;

export interface TimeControlProps extends ControlProps<Maybe<string>> {
  /**
   * The locale to use for the field.
   */
  locale?: string;

  /**
   * A partial of the Intl.DateTimeFormatOptions to use for the field, used to format the time value.
   */
  formatOptions?: TimeFormatOptions;

  /**
   * The placeholder to use for the field.
   */
  placeholder?: string;

  /**
   * Whether the field is readonly.
   */
  readonly?: boolean;

  /**
   * The minimum value to use for the field. String format: HH:MM:SS
   */
  min?: string;

  /**
   * The maximum value to use for the field. String format: HH:MM:SS
   */
  max?: string;
}

function getDefaultFormatOptions(): TimeFormatOptions {
  return {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
}

export function useTimeControl(_props: Reactivify<TimeControlProps, '_field' | 'schema'>) {
  const props = normalizeProps(_props, ['_field', 'schema']);
  const controlEl = shallowRef<HTMLInputElement>();
  const field = resolveControlField<Maybe<string>>(props);
  const { locale, direction, calendar, timeZone } = useLocale(props.locale);
  const { model, setModelValue } = useVModelProxy(field);
  const isDisabled = createDisabledContext(props.disabled);
  const formatOptions = computed(
    () => merge(getDefaultFormatOptions(), toValue(props.formatOptions) || {}) as TimeFormatOptions,
  );
  const formatter = useDateFormatter(locale, formatOptions);
  const controlId = useUniqId(FieldTypePrefixes.DateTimeField);

  const { element: inputEl } = useConstraintsValidator({
    type: 'time',
    required: props.required,
    value: model,
    source: controlEl,
    min: props.min,
    max: props.max,
  });

  useInputValidity({ field, inputEl });

  field.registerControl({
    getControlElement: () => controlEl.value,
    getControlId: () => controlId,
  });

  const temporalValue = useTemporalStore({
    calendar: calendar,
    timeZone: timeZone,
    locale: locale,
    model: {
      get: () => timeStringToDate(model.value),
      set: value => setModelValue(dateToTimeString(value, formatOptions.value)),
    },
  });

  function onValueChange(value: ZonedDateTime) {
    temporalValue.value = value;
  }

  const { segments } = useDateTimeSegmentGroup({
    formatter,
    locale,
    formatOptions: props.formatOptions,
    direction,
    controlEl,
    temporalValue,
    readonly: props.readonly,
    onValueChange,
    onTouched: () => field.setTouched(true),
    dispatchEvent: (type: string) => inputEl.value?.dispatchEvent(new Event(type)),
  });

  const controlProps = useCaptureProps(() => {
    return {
      id: controlId,
      role: 'group',
      ...field.labelledByProps.value,
      ...field.describedByProps.value,
      ...field.accessibleErrorProps.value,
      'aria-disabled': isDisabled.value || undefined,
    };
  }, controlEl);

  return exposeField(
    {
      /**
       * The id of the control element.
       */
      controlId,

      /**
       * The props to use for the control element.
       */
      controlProps,

      /**
       * The time segments, you need to render these with the `DateTimeSegment` component.
       */
      segments,

      /**
       * The direction of the field.
       */
      direction,
    },
    field,
  );
}

function timeStringToDate(time: Maybe<string>) {
  if (!time) {
    return null;
  }

  const [hours, minutes, seconds] = time.split(':').map(Number);
  const now = new Date();

  now.setHours(hours);
  now.setMinutes(minutes);
  now.setMilliseconds(0);
  if (!Number.isNaN(seconds) && !isNullOrUndefined(seconds)) {
    now.setSeconds(seconds);
  }

  return now;
}

function dateToTimeString(date: Maybe<Date>, formatOptions?: TimeFormatOptions) {
  const hours = date?.getHours();
  const minutes = date?.getMinutes();
  const seconds = date?.getSeconds();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || isNullOrUndefined(hours) || isNullOrUndefined(minutes)) {
    return undefined;
  }

  if (formatOptions?.second && !Number.isNaN(seconds) && !isNullOrUndefined(seconds)) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
