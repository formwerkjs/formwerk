import { ControlProps, Reactivify } from '../types';
import type { CalendarProps } from '../useCalendar';
import { normalizeProps, useUniqId, useCaptureProps } from '../utils/common';
import { computed, shallowRef, toValue } from 'vue';
import { exposeField, resolveControlField } from '../useFormField';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { useDateFormatter, useLocale } from '../i18n';
import { fromDateToCalendarZonedDateTime, useTemporalStore } from './useTemporalStore';
import { ZonedDateTime, Calendar } from '@internationalized/date';
import { useInputValidity } from '../validation';
import { useConstraintsValidator } from '../validation/useConstraintsValidator';
import { useVModelProxy } from '../reactivity/useVModelProxy';

export interface DateControlProps extends ControlProps<Date | undefined> {
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
   * The placeholder to use for the field.
   */
  placeholder?: string;

  /**
   * Whether the field is readonly.
   */
  readonly?: boolean;

  /**
   * The minimum date to use for the field.
   */
  min?: Date;

  /**
   * The maximum date to use for the field.
   */
  max?: Date;
}

export function useDateControl(_props: Reactivify<DateControlProps, '_field' | 'schema'>) {
  const props = normalizeProps(_props, ['_field', 'schema']);
  const controlEl = shallowRef<HTMLInputElement>();
  const field = resolveControlField<Date | undefined>(props);
  const { model, setModelValue } = useVModelProxy(field);
  const { locale, direction, timeZone, calendar } = useLocale(props.locale, {
    calendar: () => toValue(props.calendar),
    timeZone: () => toValue(props.timeZone),
  });

  const formatter = useDateFormatter(locale, props.formatOptions);
  const controlId = useUniqId(FieldTypePrefixes.DateTimeField);

  const { element: inputEl } = useConstraintsValidator({
    type: 'date',
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

  const min = computed(() => fromDateToCalendarZonedDateTime(toValue(props.min), calendar.value, timeZone.value));
  const max = computed(() => fromDateToCalendarZonedDateTime(toValue(props.max), calendar.value, timeZone.value));

  const temporalValue = useTemporalStore({
    calendar: calendar,
    timeZone: timeZone,
    locale: locale,
    model: {
      get: () => model.value,
      set: value => setModelValue(value ?? undefined),
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

  const calendarProps = computed(() => {
    const propsObj: CalendarProps = {
      label: toValue(field.label) ?? '',
      locale: locale.value,
      name: undefined,
      calendar: calendar.value,
      timeZone: timeZone.value,
      min: toValue(props.min),
      max: toValue(props.max),
      field: field,
    };

    return propsObj;
  });

  const controlProps = useCaptureProps(() => {
    return {
      id: controlId,
      role: 'group',
      ...field.labelledByProps.value,
      ...field.describedByProps.value,
      ...field.accessibleErrorProps.value,
      'aria-disabled': field.isDisabled.value || undefined,
    };
  }, controlEl);

  return exposeField(
    {
      /**
       * The props to use for the control element.
       */
      controlProps,

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
