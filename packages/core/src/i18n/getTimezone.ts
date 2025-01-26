export function getTimeZone(locale: Intl.Locale) {
  return new Intl.DateTimeFormat(locale).resolvedOptions().timeZone;
}
