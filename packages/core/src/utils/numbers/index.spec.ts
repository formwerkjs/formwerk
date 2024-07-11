import { useNumberParser } from '.';

describe('useNumberParser', () => {
  test('parses localized numbers', () => {
    const { parse } = useNumberParser({ locale: 'ar-EG' });

    expect(parse('١٬٢٣٤٬٥٦٠٫٧٨٩')).toBe(1234560.789);
  });

  test('formats localized numbers', () => {
    const { format } = useNumberParser({ locale: 'ar-EG' });

    expect(format(1234560.789)).toBe('١٬٢٣٤٬٥٦٠٫٧٨٩');
  });

  test('parses localized currency values', () => {
    const { parse } = useNumberParser({
      locale: 'ar-EG',
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 3,
    });

    expect(parse('١٬٢٣٤٬٥٦٠٫٧٨٩ ج.م.')).toBe(1234560.789);
  });

  test('formats localized currency values', () => {
    const { format } = useNumberParser({
      locale: 'ar-EG',
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 3,
    });

    expect(format(1234560.789)).toBe('‏١٬٢٣٤٬٥٦٠٫٧٨٩ ج.م.‏');
  });
});
