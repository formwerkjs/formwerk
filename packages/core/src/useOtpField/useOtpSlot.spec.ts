import { OtpSlot } from '.';
import { describe, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';

describe('useOtpSlot', () => {
  describe('when used without OtpField context', () => {
    test('should warn when rendered without OtpField context', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Render OtpSlot without a parent OtpField
      page.render({
        components: { OtpSlot },
        template: `<OtpSlot value="" />`,
      });

      // Verify that the warning was shown
      // In browser mode this can be logged more than once depending on mount/render,
      // so assert on content rather than exact count.
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('OtpSlot must be used within an OtpField'));

      warnSpy.mockRestore();
    });
  });
});
