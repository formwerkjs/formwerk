export function getUserLocale() {
  const locale = new Intl.DateTimeFormat().resolvedOptions().locale;

  return locale;
}
