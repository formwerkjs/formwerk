import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types';
import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { CalendarControlProps, useCalendarControl } from './useCalendarControl';

export type CalendarProps = WithFieldProps<CalendarControlProps>;

export function useCalendar(_props: Reactivify<CalendarProps, 'field' | 'schema'>) {
  const props = normalizeProps(_props, ['field', 'schema']);
  const field = props.field ?? useFormField(resolveFieldInit<Date | undefined>(props));
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

  return control;
}
