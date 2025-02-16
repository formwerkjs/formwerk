export function getCalendar(locale: Intl.Locale): string {
  if (locale.calendar) {
    return locale.calendar as string;
  }

  if ('calendars' in locale) {
    return (locale.calendars as string[])[0] as string;
  }

  return 'gregory';
}
