export function getLocale() {
  const locale = new Intl.DateTimeFormat().resolvedOptions().locale;

  return locale;
}
