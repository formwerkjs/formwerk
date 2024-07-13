import { useNumberParser } from '.';

const enNumber = 1234567890.12;

describe('useNumberParser', () => {
  test('parses localized numbers', () => {
    const { parse, isValidNumber } = useNumberParser('ar-EG');

    expect(parse('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(enNumber);
    expect(isValidNumber('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(true);
  });

  test('formats localized numbers', () => {
    const { format } = useNumberParser('ar-EG');

    expect(format(enNumber)).toBe('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢');
  });

  test('parses localized values with negative sign', () => {
    const { parse, isValidNumber } = useNumberParser('ar-EG');

    expect(parse('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(-enNumber);
    expect(isValidNumber('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(true);
  });

  test('formats localized values with negative sign', () => {
    const { format } = useNumberParser('ar-EG');
    const formatted = format(-enNumber);

    expect(formatted).toBe('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢');
  });

  test('parses localized currency values', () => {
    const { parse, isValidNumber } = useNumberParser('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    });

    expect(parse('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.')).toBe(enNumber);
    expect(isValidNumber('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.')).toBe(true);
  });

  test('formats localized currency values', () => {
    const { format } = useNumberParser('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    });

    expect(format(enNumber)).toBe('١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.');
  });

  test('parses negative localized currency values', () => {
    const { parse, isValidNumber } = useNumberParser('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    });

    expect(parse('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.')).toBe(-enNumber);
    expect(isValidNumber('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.')).toBe(true);
  });

  test('formats negative localized currency values', () => {
    const { format } = useNumberParser('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    });

    expect(format(-enNumber)).toBe('-١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢ ج.م.');
  });

  test('parses han numbers', () => {
    const { parse, isValidNumber } = useNumberParser('zh-Hans-CN-u-nu-hanidec');

    expect(parse('一二三,四五六.七八九')).toBe(123456.789);
    expect(isValidNumber('一二三,四五六.七八九')).toBe(true);
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
    const { parse, isValidNumber } = useNumberParser('en-US', { style: 'currency', currency: 'USD' });

    expect(parse('$ ١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(enNumber);
    expect(isValidNumber('$ ١٬٢٣٤٬٥٦٧٬٨٩٠٫١٢')).toBe(true);
  });
});
