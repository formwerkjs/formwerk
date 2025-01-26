import { Maybe, Reactivify, StandardSchema } from '../types';
import { CalendarIdentifier, CalendarProps } from '../useCalendar';
import { createDescribedByProps, isNullOrUndefined, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { computed, shallowRef, toValue } from 'vue';
import { exposeField, useFormField } from '../useFormField';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { useDateFormatter, useLocale } from '../i18n';
import { useErrorMessage, useLabel } from '../a11y';
import { TemporalValue } from './types';
import { DateValue } from './types';
import { Temporal, toTemporalInstant } from '@js-temporal/polyfill';

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
  calendar?: CalendarIdentifier;

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
  value?: DateValue;

  /**
   * The model value to use for the field.
   */
  modelValue?: DateValue;

  /**
   * The schema to use for the field.
   */
  schema?: StandardSchema<DateValue>;
}

export function useDateTimeField(_props: Reactivify<DateTimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const controlEl = shallowRef<HTMLInputElement>();
  const { locale, direction } = useLocale(props.locale, {
    calendar: () => toValue(props.calendar) ?? (toValue(props.formatOptions)?.calendar as CalendarIdentifier),
  });

  const formatter = useDateFormatter(locale, props.formatOptions);
  const controlId = useUniqId(FieldTypePrefixes.DateTimeField);

  const field = useFormField<DateValue>({
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value) ?? new Date(),
    schema: props.schema,
  });

  const { fieldValue } = field;
  const { segments } = useDateTimeSegmentGroup({
    dateValue: () => normalizeDateValue(fieldValue.value, locale.value),
    formatter,
    controlEl,
    onValueChange: field.setValue,
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
    currentDate: () => normalizeAsCalendarDate(fieldValue.value, locale.value).toPlainDate(),
    onDaySelected: day => {
      const nextValue = normalizeAsCalendarDate(fieldValue.value, locale.value);

      field.setValue(
        nextValue.with({
          year: day.year,
          month: day.month,
          day: day.day,
        }),
      );
    },
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

function normalizeDateValue(value: Maybe<DateValue>, locale: string): TemporalValue {
  if (isNullOrUndefined(value)) {
    return getNowAsTemporalValue(locale);
  }

  if (value instanceof Date) {
    const resolvedOptions = new Intl.DateTimeFormat(locale).resolvedOptions();

    return toTemporalInstant.call(value).toZonedDateTime({
      timeZone: resolvedOptions.timeZone,
      calendar: resolvedOptions.calendar,
    });
  }

  return value;
}

function getNowAsTemporalValue(locale: string) {
  return Temporal.Now.zonedDateTime(new Intl.DateTimeFormat(locale).resolvedOptions().timeZone);
}

function normalizeAsCalendarDate(value: Maybe<DateValue>, locale: string) {
  if (isNullOrUndefined(value)) {
    return getNowAsTemporalValue(locale).toPlainDateTime();
  }

  if (value instanceof Temporal.ZonedDateTime) {
    return value.toPlainDateTime();
  }

  if (value instanceof Temporal.PlainDate) {
    return value.toPlainDateTime();
  }

  if (value instanceof Temporal.PlainDateTime) {
    return value;
  }

  if (value instanceof Date || value instanceof Temporal.Instant) {
    const resolvedOptions = new Intl.DateTimeFormat(locale).resolvedOptions();

    return (value instanceof Date ? toTemporalInstant.call(value) : value).toZonedDateTime({
      timeZone: resolvedOptions.timeZone,
      calendar: resolvedOptions.calendar,
    });
  }

  throw new Error('Invalid calendar value used');
}
