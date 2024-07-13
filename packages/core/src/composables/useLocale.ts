export function useNumberFormatOptions() {
  const { locale, ...opts } = new Intl.NumberFormat().resolvedOptions();

  return {
    locale: locale,
    formatOptions: opts,
  };
}
