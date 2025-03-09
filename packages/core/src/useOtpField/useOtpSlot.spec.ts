import { OtpSlot } from '.';
import { render } from '@testing-library/vue';
import { describe, expect, test, vi } from 'vitest';
import { flush } from '@test-utils/index';

describe('useOtpSlot', () => {
  describe('when used without OtpField context', () => {
    test('should warn when rendered without OtpField context', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Render OtpSlot without a parent OtpField
      await render({
        components: { OtpSlot },
        template: `<OtpSlot value="" />`,
      });

      await flush();
      // Verify that the warning was shown
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith('[Formwerk]: OtpSlot must be used within an OtpField');

      warnSpy.mockRestore();
    });
  });
});
