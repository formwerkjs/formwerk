import { useNumberParser } from './useNumberParser';

const enNumber = 1234567890.12;

test('parses localized numbers', () => {
  const { parse, isValidNumberPart } = useNumberParser('ar-EG');

  expect(parse('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(enNumber);
  expect(isValidNumberPart('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(true);
});

test('formats localized numbers', () => {
  const { format } = useNumberParser('ar-EG');

  expect(format(enNumber)).toBe('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢');
});

test('parses localized values with negative sign', () => {
  const { parse, isValidNumberPart } = useNumberParser('ar-EG');

  expect(parse('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(-enNumber);
  expect(isValidNumberPart('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(true);
});

test('formats localized values with negative sign', () => {
  const { format } = useNumberParser('ar-EG');
  const formatted = format(-enNumber);

  expect(formatted).toBe('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢');
});

test('parses localized currency values', () => {
  const { parse, isValidNumberPart } = useNumberParser('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  });

  expect(parse('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.')).toBe(enNumber);
  expect(isValidNumberPart('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.')).toBe(true);
});

test('formats localized currency values', () => {
  const { format } = useNumberParser('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  });

  expect(format(enNumber)).toBe('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.');
});

test('parses negative localized currency values', () => {
  const { parse, isValidNumberPart } = useNumberParser('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  });

  expect(parse('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.')).toBe(-enNumber);
  expect(isValidNumberPart('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.')).toBe(true);
});

test('formats negative localized currency values', () => {
  const { format } = useNumberParser('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  });

  expect(format(-enNumber)).toBe('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.');
});

test('parses han numbers', () => {
  const { parse, isValidNumberPart } = useNumberParser('zh-Hans-CN-u-nu-hanidec');

  expect(parse('一二三,四五六.七八九')).toBe(123456.789);
  expect(isValidNumberPart('一二三,四五六.七八九')).toBe(true);
});

test('formats to numbers', () => {
  const { format } = useNumberParser('zh-Hans-CN-u-nu-hanidec');

  expect(format(123456.789)).toBe('一二三,四五六.七八九');
});

test('parsing/formatting is consistent', () => {
  const { format, parse } = useNumberParser('ar-EG', { style: 'currency', currency: 'EGP' });

  const value = 1234567.89;
  const formatted = format(value);
  const parsed = parse(formatted);

  expect(parsed).toBe(value);
});

test('tries different numbering systems for parsing', () => {
  const { parse, isValidNumberPart } = useNumberParser('en-US', { style: 'currency', currency: 'USD' });

  expect(parse('$ ١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(enNumber);
  expect(isValidNumberPart('$ ١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(true);
});

test('handles accounting currency sign', () => {
  const { parse, isValidNumberPart } = useNumberParser('en-US', {
    style: 'currency',
    currency: 'USD',
    currencySign: 'accounting',
  });

  expect(parse('($1,234,567,890.12)')).toBe(-enNumber);
  expect(isValidNumberPart('($$1,234,567,890.12)')).toBe(true);
});

test('parses and validates percentages', () => {
  const { parse, isValidNumberPart } = useNumberParser('en-US', { style: 'percent' });

  expect(parse('12%')).toBe(0.12);
  expect(isValidNumberPart('12%')).toBe(true);
});

test('parses and validates localized percentages', () => {
  const { parse, isValidNumberPart } = useNumberParser('ar-EG', { style: 'percent' });

  expect(parse('١٢٪')).toBe(0.12);
  expect(isValidNumberPart('١٢٪')).toBe(true);
});
