import { CalendarIdentifier } from '../useCalendar';

export function getCalendar(locale: Intl.Locale): CalendarIdentifier {
  if (locale.calendar) {
    return locale.calendar as CalendarIdentifier;
  }

  if ('calendars' in locale) {
    return (locale.calendars as string[])[0] as CalendarIdentifier;
  }

  return 'gregory';
}
