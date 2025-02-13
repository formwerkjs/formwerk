import { Maybe, Reactivify, StandardSchema } from '../types';
import { CalendarProps } from '../useCalendar';
import { createDescribedByProps, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { computed, shallowRef, toValue } from 'vue';
import { exposeField, useFormField } from '../useFormField';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { useDateFormatter, useLocale } from '../i18n';
import { useErrorMessage, useLabel } from '../a11y';
import { useTemporalStore } from './useTemporalStore';
import { ZonedDateTime, Calendar } from '@internationalized/date';
import { isTemporalPartial } from './temporalPartial';

export interface DateTimeFieldProps {
  /**
   * The label to use for the field.
   */
  label: string;

  /**
   * The name to use for the field.
   */
  name: string;

  /**
   * The locale to use for the field.
   */
  locale?: string;

  /**
   * The calendar type to use for the field, e.g. `gregory`, `islamic-umalqura`, etc.
   */
  calendar?: Calendar;

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
  minDate?: Date;

  /**
   * The maximum date to use for the field.
   */
  maxDate?: Date;
}

export function useDateTimeField(_props: Reactivify<DateTimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const controlEl = shallowRef<HTMLInputElement>();
  const { locale, direction, timeZone, calendar } = useLocale(props.locale, {
    calendar: () => toValue(props.calendar),
  });

  const formatter = useDateFormatter(locale, props.formatOptions);
  const controlId = useUniqId(FieldTypePrefixes.DateTimeField);

  const field = useFormField<Maybe<Date>>({
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    schema: props.schema,
  });

  const minDate = useTemporalStore({
    calendar: calendar,
    timeZone: timeZone,
    locale: locale,
    model: {
      get: () => toValue(props.minDate),
    },
  });

  const maxDate = useTemporalStore({
    calendar: calendar,
    timeZone: timeZone,
    locale: locale,
    model: {
      get: () => toValue(props.maxDate),
    },
  });

  const temporalValue = useTemporalStore({
    calendar: calendar,
    timeZone: timeZone,
    locale: locale,
    model: {
      get: () => field.fieldValue.value,
      set: value => field.setValue(value),
    },
  });

  function onValueChange(value: ZonedDateTime) {
    temporalValue.value = value;
  }

  const { segments } = useDateTimeSegmentGroup({
    formatter,
    locale,
    formatOptions: props.formatOptions,
    controlEl,
    temporalValue,
    onValueChange,
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

  const calendarProps: Reactivify<CalendarProps, 'onDaySelected'> = {
    locale: () => locale.value,
    currentDate: temporalValue,
    onDaySelected: onValueChange,
    minDate: () => (isTemporalPartial(minDate.value) ? undefined : minDate.value),
    maxDate: () => (isTemporalPartial(maxDate.value) ? undefined : maxDate.value),
  };

  const controlProps = computed(() => {
    return withRefCapture(
      {
        id: controlId,
        ...labelledByProps.value,
        ...describedByProps.value,
        ...accessibleErrorProps.value,
      },
      controlEl,
    );
  });

  return exposeField(
    {
      controlEl,
      controlProps,
      descriptionProps,
      labelProps,
      segments,
      errorMessageProps,
      calendarProps,
      direction,
    },
    field,
  );
}
