import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types';
import { getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { CalendarControlProps, useCalendarControl } from './useCalendarControl';

export type CalendarProps = WithFieldProps<CalendarControlProps>;

export function useCalendar(_props: Reactivify<CalendarProps, 'field' | 'schema'>) {
  const props = normalizeProps(_props, ['field', 'schema']);
  let field = props.field;
  if (!field) {
    field = useFormField(getFieldInit<Date | undefined>(props)).state;
  }

  const control = useCalendarControl({
    ...props,
    field: props.field,
  });

  return control;
}
