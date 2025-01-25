import { Maybe, Reactivify } from '../types';
import { createDescribedByProps, isNullOrUndefined, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { computed, shallowRef, toValue } from 'vue';
import { exposeField, useFormField } from '../useFormField';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { useDateFormatter, useLocale } from '../i18n';
import { useErrorMessage, useLabel } from '../a11y';
import { TemporalDate } from './types';
import { DateValue } from './types';
import { Temporal, toTemporalInstant } from '@js-temporal/polyfill';

export interface DateTimeFieldProps {
  label: string;
  locale?: string;
  name: string;
  formatOptions?: Intl.DateTimeFormatOptions;
  description?: string;
  placeholder?: string;
  readonly?: boolean;
  disabled?: boolean;
  value?: DateValue;
  modelValue?: DateValue;

  schema?: any;
}

export function useDateTimeField(_props: Reactivify<DateTimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const controlEl = shallowRef<HTMLInputElement>();
  const { locale } = useLocale();
  const fieldLocale = computed(() => toValue(props.locale) ?? locale.value);
  const formatter = useDateFormatter(fieldLocale, props.formatOptions);
  const controlId = useUniqId(FieldTypePrefixes.DateTimeField);

  const field = useFormField<DateValue>({
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value) ?? new Date(),
    schema: props.schema,
  });

  const { fieldValue } = field;
  const { segments } = useDateTimeSegmentGroup({
    dateValue: () => normalizeDateValue(fieldValue.value, fieldLocale.value),
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
    },
    field,
  );
}

function normalizeDateValue(value: Maybe<DateValue>, locale: string): TemporalDate {
  if (isNullOrUndefined(value)) {
    return getNowAsTemporalDate(locale);
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

function getNowAsTemporalDate(locale: string) {
  return Temporal.Now.zonedDateTime(new Intl.DateTimeFormat(locale).resolvedOptions().timeZone);
}
