import { Maybe, Reactivify, StandardSchema } from '../types';
import type { CalendarProps } from '../useCalendar';
import { createDescribedByProps, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { computed, shallowRef, toValue } from 'vue';
import { exposeField, useFormField } from '../useFormField';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { useDateFormatter, useLocale } from '../i18n';
import { useErrorMessage, useLabel } from '../a11y';
import { fromDateToCalendarZonedDateTime, useTemporalStore } from './useTemporalStore';
import { ZonedDateTime, Calendar } from '@internationalized/date';
import { useInputValidity } from '../validation';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { registerField } from '@formwerk/devtools';
import { useConstraintsValidator } from '../validation/useConstraintsValidator';

export interface DateTimeFieldProps {
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
   * The calendar type to use for the field, e.g. `gregory`, `islamic-umalqura`, etc.
   */
  calendar?: Calendar;

  /**
   * The time zone to use for the field, e.g. `UTC`, `America/New_York`, etc.
   */
  timeZone?: string;

  /**
   * The Intl.DateTimeFormatOptions to use for the field, used to format the date value.
   */
  formatOptions?: Intl.DateTimeFormatOptions;

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
  value?: Date;

  /**
   * The model value to use for the field.
   */
  modelValue?: Date;

  /**
   * The schema to use for the field.
   */
  schema?: StandardSchema<Date>;

  /**
   * The minimum date to use for the field.
   */
  min?: Date;

  /**
   * The maximum date to use for the field.
   */
  max?: Date;
}

export function useDateTimeField(_props: Reactivify<DateTimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const controlEl = shallowRef<HTMLInputElement>();
  const { locale, direction, timeZone, calendar } = useLocale(props.locale, {
    calendar: () => toValue(props.calendar),
    timeZone: () => toValue(props.timeZone),
  });

  const isDisabled = createDisabledContext(props.disabled);
  const formatter = useDateFormatter(locale, props.formatOptions);
  const controlId = useUniqId(FieldTypePrefixes.DateTimeField);

  const field = useFormField<Maybe<Date>>({
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    schema: props.schema,
  });

  const { element: inputEl } = useConstraintsValidator({
    type: 'date',
    required: props.required,
    value: field.fieldValue,
    source: controlEl,
    min: props.min,
    max: props.max,
  });

  useInputValidity({ field, inputEl });

  const min = computed(() => fromDateToCalendarZonedDateTime(toValue(props.min), calendar.value, timeZone.value));
  const max = computed(() => fromDateToCalendarZonedDateTime(toValue(props.max), calendar.value, timeZone.value));

  const temporalValue = useTemporalStore({
    calendar: calendar,
    timeZone: timeZone,
    locale: locale,
    model: {
      get: () => field.fieldValue.value,
      set: value => field.setValue(value),
    },
    min,
    max,
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
    min,
    max,
    dispatchEvent: (type: string) => inputEl.value?.dispatchEvent(new Event(type)),
  });

  const { labelProps, labelledByProps } = useLabel({
    for: controlId,
    label: props.label,
    targetRef: controlEl,
  });

  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId: controlId,
    description: props.description,
  });

  const { errorMessageProps, accessibleErrorProps } = useErrorMessage({
    inputId: controlId,
    errorMessage: field.errorMessage,
  });

  const calendarProps = computed(() => {
    const propsObj: CalendarProps = {
      label: toValue(props.label),
      locale: locale.value,
      name: undefined,
      calendar: calendar.value,
      min: toValue(props.min),
      max: toValue(props.max),
      field,
    };

    return propsObj;
  });

  const controlProps = computed(() => {
    return withRefCapture(
      {
        id: controlId,
        role: 'group',
        ...labelledByProps.value,
        ...describedByProps.value,
        ...accessibleErrorProps.value,
        'aria-disabled': isDisabled.value || undefined,
      },
      controlEl,
    );
  });

  if (__DEV__) {
    registerField(field, 'Date');
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
       * The datetime segments, you need to render these with the `DateTimeSegment` component.
       */
      segments,

      /**
       * The props to use for the calendar composable/component.
       */
      calendarProps,

      /**
       * The direction of the field.
       */
      direction,
    },
    field,
  );
}
