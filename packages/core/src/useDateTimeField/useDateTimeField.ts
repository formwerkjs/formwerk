import { Reactivify } from '../types';
import { createDescribedByProps, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { computed, shallowRef, toValue } from 'vue';
import { exposeField, useFormField } from '../useFormField';
import { useDateTimeSegmentGroup } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { useDateFormatter, useLocale } from '../i18n';
import { useErrorMessage, useLabel } from '../a11y';

export interface DateTimeFieldProps {
  label: string;
  locale?: string;
  name: string;
  formatOptions?: Intl.DateTimeFormatOptions;
  description?: string;
  placeholder?: string;
  readonly?: boolean;
  disabled?: boolean;
  value?: Date;
  modelValue?: Date;

  schema?: any;
}

export function useDateTimeField(_props: Reactivify<DateTimeFieldProps, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const controlEl = shallowRef<HTMLInputElement>();
  const { locale } = useLocale();
  const formatter = useDateFormatter(() => toValue(props.locale) ?? locale.value, props.formatOptions);
  const controlId = useUniqId(FieldTypePrefixes.DateTimeField);
  const field = useFormField<Date>({
    path: props.name,
    disabled: props.disabled,
    initialValue: toValue(props.modelValue) ?? toValue(props.value) ?? new Date(),
    schema: props.schema,
  });

  const { fieldValue } = field;
  const { segments } = useDateTimeSegmentGroup({
    dateValue: () => fieldValue.value ?? new Date(),
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
