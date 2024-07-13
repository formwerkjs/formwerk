import { computed, MaybeRefOrGetter, toValue } from 'vue';

const SYMBOL_PART_TYPES: Partial<Record<Intl.NumberFormatPartTypes, boolean>> = {
  percentSign: true,
  currency: true,
};

/**
 * Zero widths and RTL and LTR markers are produced sometimes with Intl.NumberFormat, we need to remove them to get as clean as a number as possible.
 */
const NON_PRINTABLE_RE = /\p{C}/gu;

const SPACES_RE = /\s/g;

export function useNumberParser(locale: MaybeRefOrGetter<string>, opts?: MaybeRefOrGetter<Intl.NumberFormatOptions>) {
  const formatter = computed(() => new Intl.NumberFormat(toValue(locale), toValue(opts)));

  const parts = computed(() => formatter.value.formatToParts(12345.6789));

  const getDecimal = () => parts.value.find(part => part.type === 'decimal')?.value || '.';
  const getGroup = () => parts.value.find(part => part.type === 'group')?.value || ',';
  const getUnitSymbol = () => parts.value.find(part => SYMBOL_PART_TYPES[part.type])?.value;

  const groupRE = computed(() => new RegExp(`[${getGroup()}]`, 'g'));
  const decimalRE = computed(() => new RegExp(`[${getDecimal()}]`));
  const symbolRE = computed(() => {
    const symbol = getUnitSymbol();

    return symbol ? new RegExp(`${getUnitSymbol()}`) : null;
  });

  const numerals = computed(() =>
    [...new Intl.NumberFormat(toValue(locale), { useGrouping: false }).format(9876543210)].reverse(),
  );
  const getNumberingMap = () => new Map(numerals.value.map((d, i) => [d, i]));
  const numeralRE = computed(() => new RegExp(`[${numerals.value.join('')}]`, 'g'));

  function resolveNumber(number: string) {
    return String(getNumberingMap().get(number)) || '';
  }

  function parse(value: string): number {
    let parsed = value.replace(groupRE.value, '').replace(decimalRE.value, '.').replace(numeralRE.value, resolveNumber);
    if (symbolRE.value) {
      parsed = parsed.replace(symbolRE.value, '');
    }

    parsed = parsed.replace(SPACES_RE, '');

    return Number(parsed.trim());
  }

  function format(value: number): string {
    return formatter.value.format(value).replace(NON_PRINTABLE_RE, '').trim();
  }

  return {
    parse,
    format,
    formatToParts: (value: number) => formatter.value.formatToParts(value),
  };
}
