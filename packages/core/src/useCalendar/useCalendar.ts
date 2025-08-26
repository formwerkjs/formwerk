import { toValue } from 'vue';
import { normalizeProps } from '../utils/common';
import { Maybe, Reactivify } from '../types';
import { exposeField, FieldBaseProps, useFormField } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { CalendarControlProps, useCalendarControl } from './useCalendarControl';

export type CalendarProps = CalendarControlProps & FieldBaseProps<Maybe<Date>>;

export function useCalendar(_props: Reactivify<CalendarProps, 'field' | 'schema'>) {
  const props = normalizeProps(_props, ['field', 'schema']);
  const field =
    props.field ??
    useFormField<Maybe<Date>>({
      label: props.label,
      path: props.name,
      disabled: props.disabled,
      initialValue: toValue(props.modelValue) ?? toValue(props.value),
      schema: props.schema,
    });

  const control = useCalendarControl({
    ...props,
    field,
  });

  if (__DEV__) {
    // If it is its own field, we should register it with devtools.
    if (!props.field) {
      registerField(field, 'Calendar');
    }
  }

  return exposeField(control, field);
}
