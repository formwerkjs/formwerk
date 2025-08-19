import { Maybe, Reactivify, StandardSchema } from '../types';
import { isNullOrUndefined, normalizeProps, useUniqId, useCaptureProps } from '../utils/common';
import { computed, shallowRef, toValue } from 'vue';
import { exposeField, useFieldState } from '../useFieldState';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { useDateFormatter, useLocale } from '../i18n';
import { useErrorMessage, useLabel, useDescription } from '../a11y';
import { useTemporalStore } from './useTemporalStore';
import { ZonedDateTime } from '@internationalized/date';
import { useInputValidity } from '../validation';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { registerField } from '@formwerk/devtools';
import { useConstraintsValidator } from '../validation/useConstraintsValidator';
import { merge } from '../../../shared/src';
import { Simplify } from 'type-fest';

export type TimeFormatOptions = Simplify<
  Pick<Intl.DateTimeFormatOptions, 'hour' | 'minute' | 'second' | 'dayPeriod' | 'timeZone' | 'hour12'>
>;

export interface TimeFieldProps {
  /**
   * The label to use for the field.
   */
  label: string;

  /**
   * The name to use for the field.
   */
  name?: string;

  /**
   * Whether the field is required.
   */
  required?: boolean;

  /**
   * The locale to use for the field.
   */
  locale?: string;

  /**
   * A partial of the Intl.DateTimeFormatOptions to use for the field, used to format the time value.
   */
  formatOptions?: TimeFormatOptions;

  /**
   * The description to use for the field.
   */
  description?: string;

  /**
   * The placeholder to use for the field.
   */
  placeholder?: string;

  /**
   * Whether the field is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the field is disabled.
   */
  disabled?: boolean;

  /**
   * The value to use for the field.
   */
  value?: string;

  /**
   * The model value to use for the field.
   */
  modelValue?: string;

  /**
   * The schema to use for the field.
   */
  schema?: StandardSchema<string>;

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

export function useTimeField(_props: Reactivify<TimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const controlEl = shallowRef<HTMLInputElement>();
  const { locale, direction, calendar, timeZone } = useLocale(props.locale);

  const formatOptions = computed(
    () => merge(getDefaultFormatOptions(), toValue(props.formatOptions) || {}) as TimeFormatOptions,
  );

  const isDisabled = createDisabledContext(props.disabled);
  const formatter = useDateFormatter(locale, formatOptions);
  const controlId = useUniqId(FieldTypePrefixes.DateTimeField);

  const field = useFieldState<Maybe<string>>({
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    schema: props.schema,
  });

  const { element: inputEl } = useConstraintsValidator({
    type: 'time',
    required: props.required,
    value: field.fieldValue,
    source: controlEl,
    min: props.min,
    max: props.max,
  });

  useInputValidity({ field, inputEl });

  const temporalValue = useTemporalStore({
    calendar: calendar,
    timeZone: timeZone,
    locale: locale,
    model: {
      get: () => timeStringToDate(field.fieldValue.value),
      set: value => field.setValue(dateToTimeString(value, formatOptions.value)),
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

  const { labelProps, labelledByProps } = useLabel({
    for: controlId,
    label: props.label,
    targetRef: controlEl,
  });

  const { descriptionProps, describedByProps } = useDescription({
    inputId: controlId,
    description: props.description,
  });

  const { errorMessageProps, accessibleErrorProps } = useErrorMessage({
    inputId: controlId,
    errorMessage: field.errorMessage,
  });

  const controlProps = useCaptureProps(() => {
    return {
      id: controlId,
      role: 'group',
      ...labelledByProps.value,
      ...describedByProps.value,
      ...accessibleErrorProps.value,
      'aria-disabled': isDisabled.value || undefined,
    };
  }, controlEl);

  if (__DEV__) {
    registerField(field, 'Time');
  }

  return exposeField(
    {
      /**
       * The props to use for the control element.
       */
      controlProps,

      /**
       * The props to use for the description element.
       */
      descriptionProps,

      /**
       * The props to use for the label element.
       */
      labelProps,

      /**
       * The props to use for the error message element.
       */
      errorMessageProps,

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
