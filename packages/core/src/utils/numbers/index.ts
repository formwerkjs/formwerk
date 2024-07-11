export interface NumberParserOptions extends Intl.NumberFormatOptions {
  locale: string;
}

const SYMBOL_PART_TYPES: Partial<Record<Intl.NumberFormatPartTypes, boolean>> = {
  percentSign: true,
  currency: true,
};

/**
 * Zero widths and RTL and LTR markers are produced sometimes with Intl.NumberFormat, we need to remove them to get as clean as a number as possible.
 */
const NON_PRINTABLE_RE = /\p{C}/gu;

export function useNumberParser({ locale, ...options }: NumberParserOptions) {
  const formatter = new Intl.NumberFormat(locale, options);
  const parts = formatter.formatToParts(12345.6789);

  const decimal = parts.find(part => part.type === 'decimal')?.value || '.';
  const group = parts.find(part => part.type === 'group')?.value || ',';
  const symbol = parts.find(part => SYMBOL_PART_TYPES[part.type])?.value;

  const groupRE = new RegExp(`[${group}]`, 'g');
  const decimalRE = new RegExp(`[${decimal}]`);
  const symbolRE = symbol ? new RegExp(`${symbol}`) : null;

  const numerals = [...new Intl.NumberFormat(locale, { useGrouping: false }).format(9876543210)].reverse();
  const numeralsIdxMap = new Map(numerals.map((d, i) => [d, i]));
  const numeralRE = new RegExp(`[${numerals.join('')}]`, 'g');

  function resolveNumber(number: string) {
    return String(numeralsIdxMap.get(number)) || '';
  }

  function parse(value: string): number {
    let parsed = value.replace(groupRE, '').replace(decimalRE, '.').replace(numeralRE, resolveNumber);
    if (symbolRE) {
      parsed = parsed.replace(symbolRE, '');
    }

    return Number(parsed.trim());
  }

  function format(value: number): string {
    return formatter.format(value).replace(NON_PRINTABLE_RE, '').trim();
  }

  return {
    parse,
    format,
    formatToParts: (value: number) => formatter.formatToParts(value),
  };
}
