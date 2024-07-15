import { MaybeRefOrGetter, toValue } from 'vue';

/**
 * Stuff that are considered "literals" that's not part of the number itself and should be stripped out when parsing/validating.
 */
const LITERAL_PART_TYPES: Partial<Record<Intl.NumberFormatPartTypes, boolean>> = {
  percentSign: true,
  currency: true,
  literal: true,
};

/**
 * Numbering systems that are supported by Intl.NumberFormat, user input may not match their own locale/site accepted locale.
 */
const NUMBERING_SYSTEMS = ['latn', 'arab', 'hanidec'];

/**
 * Needed for cleaning up the currency accounting sign from the number (e.g: `($ 123)`).
 */
const CURRENCY_SIGN_RE = /^.*\(.*\).*$/;

/**
 * Zero widths and RTL and LTR markers are produced sometimes with Intl.NumberFormat, we need to remove them to get as clean as a number as possible.
 */
const NON_PRINTABLE_RE = /\p{C}/gu;

const SPACES_RE = /[\p{White_Space}]/gu;

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
  literalsRE?: RegExp;

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
  const parts = formatter.formatToParts(-12345.6789);
  const positiveParts = formatter.formatToParts(1);
  const decimal = parts.find(part => part.type === 'decimal')?.value || '.';
  const group = parts.find(part => part.type === 'group')?.value || ',';
  const literals = new Set(parts.filter(part => LITERAL_PART_TYPES[part.type]).map(p => p.value));
  const minusSign = parts.find(part => part.type === 'minusSign')?.value;
  const plusSign = positiveParts.find(part => part.type === 'plusSign')?.value;
  const numerals = [...new Intl.NumberFormat(toValue(locale), { useGrouping: false }).format(9876543210)].reverse();
  const resolvedOptions = formatter.resolvedOptions();

  const numeralMap = new Map(numerals.map((d, i) => [d, i]));
  const numeralRE = new RegExp(`[${numerals.join('')}]`, 'g');
  const literalsRE =
    literals.size > 0 ? new RegExp(`${[...literals].map(escapeStringRegexp).join('|')}`, 'g') : undefined;

  const symbols: NumberSymbols = {
    decimal,
    group,
    literalsRE,
    numeralRE,
    minusSign,
    plusSign,
    resolveNumber: (number: string) => {
      return String(numeralMap.get(number)) || '';
    },
  };

  /**
   * Cleans up the value from some quirks around some locales to get as much as a clean number as possible.
   */
  function sanitize(value: string): string {
    let sanitized = value;
    if (symbols.literalsRE) {
      sanitized = sanitized.replace(symbols.literalsRE, '');
    }

    if (symbols.minusSign) {
      sanitized = sanitized.replace('-', symbols.minusSign);
    }

    // Apply some corrections for the arabic numbering system as keyboard layouts may not be consistent.
    if (resolvedOptions.numberingSystem === 'arab') {
      if (symbols.group) {
        // Many Arabic keyboards only has the Arabic comma (1548) which many users mistake it for the group separator (1644), they look identical, so we need to clean it out as well.
        sanitized = sanitized.replaceAll(String.fromCharCode(1548), symbols.group);
      }

      if (symbols.decimal) {
        // Some arabic keyboards use the (44) comma as a decimal separator, we need to clean it out as well and replace it with the (1643)
        sanitized = sanitized.replace(String.fromCharCode(44), symbols.decimal);
      }
    }

    return sanitized.replace(SPACES_RE, '');
  }

  function parse(value: string): number {
    let sanitized = sanitize(value);
    if (symbols.group) {
      sanitized = sanitized.replaceAll(symbols.group, '');
    }

    if (symbols.decimal) {
      sanitized = sanitized.replace(symbols.decimal, '.');
    }

    sanitized = sanitized.replace(symbols.numeralRE, symbols.resolveNumber);

    const parsed = Number(sanitized);
    if (Number.isNaN(parsed)) {
      return NaN;
    }

    // If the currency sign is accounting, we need to negate the number.
    if (options.currencySign === 'accounting' && CURRENCY_SIGN_RE.test(value)) {
      return -parsed;
    }

    if (options.style === 'percent') {
      return parsed / 100;
    }

    return parsed;
  }

  function format(value: number): string {
    return formatter.format(value).replace(NON_PRINTABLE_RE, '').trim();
  }

  function isValidNumberPart(value: string) {
    let sanitized = sanitize(value);

    if (symbols.group) {
      sanitized = sanitized.replaceAll(symbols.group, '');
    }

    if (symbols.decimal) {
      sanitized = sanitized.replace(symbols.decimal, '');
    }

    if (symbols.minusSign) {
      sanitized = sanitized.replace(symbols.minusSign, '');
    }

    if (symbols.plusSign) {
      sanitized = sanitized.replace(symbols.plusSign, '');
    }

    sanitized = sanitized.replace(symbols.numeralRE, '');

    return sanitized.length === 0;
  }

  return {
    formatter,
    locale,
    options: resolvedOptions,
    symbols,
    parse,
    format,
    isValidNumberPart,
  };
}

export function useNumberParser(
  locale: MaybeRefOrGetter<string>,
  opts?: MaybeRefOrGetter<Intl.NumberFormatOptions | undefined>,
) {
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

/**
 * https://github.com/sindresorhus/escape-string-regexp
 */
function escapeStringRegexp(string: string) {
  // Escape characters with special meaning either inside or outside character sets.
  // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
  return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
}
