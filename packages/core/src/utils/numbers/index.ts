import { MaybeRefOrGetter, toValue } from 'vue';

const SYMBOL_PART_TYPES: Partial<Record<Intl.NumberFormatPartTypes, boolean>> = {
  percentSign: true,
  currency: true,
};

/**
 * Numbering systems that are supported by Intl.NumberFormat, user input may not match their own locale/site accepted locale.
 */
const NUMBERING_SYSTEMS = ['latn', 'arab', 'hanidec'];

/**
 * Zero widths and RTL and LTR markers are produced sometimes with Intl.NumberFormat, we need to remove them to get as clean as a number as possible.
 */
const NON_PRINTABLE_RE = /\p{C}/gu;

const SPACES_RE = /\s/g;

interface NumberSymbols {
  /**
   * The decimal separator.
   */
  decimal?: string;
  /**
   * The thousands separator.
   */
  group?: string;
  /**
   * Currency symbol or percent sign or any unit.
   */
  literals?: string;

  /**
   * A regular expression to match numerals in the current locale.
   */
  numeralRE: RegExp;

  minusSign?: string;

  plusSign?: string;

  /**
   * Converts a locale numeral to a number (latin).
   */
  resolveNumber: (number: string) => string;
}

interface NumberParser {
  formatter: Intl.NumberFormat;
  options: Intl.ResolvedNumberFormatOptions;
  locale: string;
  symbols: NumberSymbols;
  parse(value: string): number;
  format(value: number): string;
  isValidNumberPart(value: string): boolean;
}

const numberParserCache = new Map<string, NumberParser>();

function getParser(locale: string, options: Intl.NumberFormatOptions) {
  const cacheKey = locale + JSON.stringify(options);
  let parser = numberParserCache.get(cacheKey);
  if (!parser) {
    parser = defineNumberParser(locale, options);
    numberParserCache.set(cacheKey, parser);
  }

  return parser;
}

export function defineNumberParser(locale: string, options: Intl.NumberFormatOptions): NumberParser {
  const formatter = new Intl.NumberFormat(locale, options);
  const negativeParts = formatter.formatToParts(-12345.6789);
  const positiveParts = formatter.formatToParts(1);
  const decimal = negativeParts.find(part => part.type === 'decimal')?.value || '.';
  const group = negativeParts.find(part => part.type === 'group')?.value || ',';
  const literals = negativeParts.find(part => SYMBOL_PART_TYPES[part.type])?.value;
  const minusSign = negativeParts.find(part => part.type === 'minusSign')?.value;
  const plusSign = positiveParts.find(part => part.type === 'plusSign')?.value;
  const numerals = [...new Intl.NumberFormat(toValue(locale), { useGrouping: false }).format(9876543210)].reverse();

  const numeralMap = new Map(numerals.map((d, i) => [d, i]));
  const numeralRE = new RegExp(`[${numerals.join('')}]`, 'g');

  const symbols: NumberSymbols = {
    decimal,
    group,
    literals: literals,
    numeralRE,
    minusSign,
    plusSign,
    resolveNumber: (number: string) => {
      return String(numeralMap.get(number)) || '';
    },
  };

  function sanitize(value: string): string {
    let sanitized = value;
    if (symbols.group) {
      sanitized = sanitized.replaceAll(symbols.group, '');
    }

    if (symbols.decimal) {
      sanitized = sanitized.replace(symbols.decimal, '.');
    }

    if (symbols.literals) {
      sanitized = sanitized.replace(symbols.literals, '');
    }

    sanitized = sanitized.replace(symbols.numeralRE, symbols.resolveNumber).replace(SPACES_RE, '');

    return sanitized.trim();
  }

  function parse(value: string): number {
    const parsed = sanitize(value);

    return Number(parsed);
  }

  function format(value: number): string {
    return formatter.format(value).replace(NON_PRINTABLE_RE, '').trim();
  }

  function isValidNumberPart(value: string) {
    let sanitized = value;
    if (symbols.group) {
      sanitized = sanitized.replaceAll(symbols.group, '');
    }

    if (symbols.decimal) {
      sanitized = sanitized.replace(symbols.decimal, '');
    }

    if (symbols.literals) {
      sanitized = sanitized.replace(symbols.literals, '');
    }

    if (symbols.minusSign) {
      sanitized = sanitized.replace(symbols.minusSign, '');
    }

    if (symbols.plusSign) {
      sanitized = sanitized.replace(symbols.plusSign, '');
    }

    sanitized = sanitized.replace(symbols.numeralRE, '').replace(SPACES_RE, '');

    return sanitized.length === 0;
  }

  return {
    formatter,
    locale,
    options: formatter.resolvedOptions(),
    symbols,
    parse,
    format,
    isValidNumberPart,
  };
}

export function useNumberParser(locale: MaybeRefOrGetter<string>, opts?: MaybeRefOrGetter<Intl.NumberFormatOptions>) {
  function resolveParser(value: string) {
    const defaultLocale = toValue(locale);
    const defaultOpts = toValue(opts) || {};
    // Gets the default parser as per the user config
    const defaultParser = getParser(defaultLocale, defaultOpts);

    // If the value is a valid number, return the default parser as it is good enough to parse it.
    // Or if the locale has a hardcoded numbering system, we quit and return the default one.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale#description
    if (defaultParser.isValidNumberPart(value) || defaultLocale.includes('-nu-')) {
      return defaultParser;
    }

    // Otherwise, we need to find the correct parser for the value, this is because the value may be in a different numbering system.
    // The user may prefer to use a different numbering system than the one that is used in the locale.
    for (const numberingSystem of NUMBERING_SYSTEMS) {
      // Skip loop if the default numbering system is the same as the one we are trying.
      if (defaultParser.options.numberingSystem === numberingSystem) {
        continue;
      }

      const tryLocale = defaultLocale.includes('-u-')
        ? `${defaultLocale}-nu-${numberingSystem}`
        : `${defaultLocale}-u-nu-${numberingSystem}`;

      const parser = getParser(tryLocale, defaultOpts);
      if (parser.isValidNumberPart(value)) {
        return parser;
      }
    }

    return defaultParser;
  }

  function getNumberingSystem(value: string) {
    return resolveParser(value).options.numberingSystem;
  }

  function parse(value: string): number {
    return resolveParser(value).parse(value);
  }

  function isValidNumberPart(value: string) {
    return resolveParser(value).isValidNumberPart(value);
  }

  function format(value: number): string {
    return getParser(toValue(locale), toValue(opts) || {}).format(value);
  }

  return {
    parse,
    format,
    isValidNumberPart,
    getNumberingSystem,
  };
}
