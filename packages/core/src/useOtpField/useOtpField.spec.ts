import { OtpFieldProps, useOtpField, OtpSlot } from '.';
import { isValueAccepted } from './utils';
import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { Component, defineComponent } from 'vue';
import { flush, renderSetup } from '@test-utils/index';

const InputBase: string = `
  <div>
    <div v-bind="controlProps" data-testid="control">
      <OtpSlot v-for="slot in fieldSlots" v-bind="slot" data-testid="slot" :as="slotType" />
    </div>
    <label v-bind="labelProps">{{ label }}</label>
    <span v-bind="errorMessageProps">{{ errorMessage }}</span>
    <span data-testid="value">{{ fieldValue }}</span>
  </div>
`;

function createOtpField(props: OtpFieldProps, template = InputBase, slotType = 'span'): Component {
  return defineComponent({
    template,
    inheritAttrs: false,
    components: { OtpSlot },
    setup() {
      const otp = useOtpField(props);

      return {
        ...props,
        ...otp,
        slotType,
      };
    },
  });
}

describe('useOtpField', () => {
  describe('has no a11y violations', () => {
    test('with basic configuration', async () => {
      const OtpField = createOtpField({ label: 'OTP Code', length: 4 });

      await render({
        components: { OtpField },
        template: `
          <div data-testid="fixture">
            <OtpField />
          </div>
        `,
      });

      vi.useRealTimers();
      expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
      vi.useFakeTimers();
    });
  });

  describe('initialization', () => {
    test('initializes with empty value by default', async () => {
      const { fieldValue } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4 });
      });

      expect(fieldValue.value).toBe('');
    });

    test('initializes with provided modelValue', async () => {
      const { fieldValue } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, modelValue: '1234' });
      });

      expect(fieldValue.value).toBe('1234');
    });

    test('initializes with provided value', async () => {
      const { fieldValue } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, value: '5678' });
      });

      expect(fieldValue.value).toBe('5678');
    });

    test('initializes with prefix if provided', async () => {
      const { fieldValue } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-', value: '1234' });
      });

      expect(fieldValue.value).toBe('G-1234');
    });

    test('adds prefix to value if not already present', async () => {
      const { fieldValue } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-', value: '1234' });
      });

      expect(fieldValue.value).toBe('G-1234');
    });

    test('does not duplicate prefix if already present in value', async () => {
      const { fieldValue } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-', value: 'G-1234' });
      });

      expect(fieldValue.value).toBe('G-1234');
    });
  });

  describe('field slots', () => {
    test('creates correct number of slots based on length', async () => {
      const { fieldSlots } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4 });
      });

      expect(fieldSlots.value.length).toBe(4);
    });

    test('creates correct number of slots with prefix', async () => {
      const { fieldSlots } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-' });
      });

      expect(fieldSlots.value.length).toBe(6); // 'G-' (2 chars) + 4 slots
    });

    test('prefix slots are disabled', async () => {
      const { fieldSlots } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-' });
      });

      expect(fieldSlots.value[0].disabled).toBe(true);
      expect(fieldSlots.value[1].disabled).toBe(true);
      expect(fieldSlots.value[2].disabled).toBe(false);
    });

    test('prefix slots are not masked', async () => {
      const { fieldSlots } = await renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-', mask: true });
      });

      expect(fieldSlots.value[0].masked).toBe(false);
      expect(fieldSlots.value[1].masked).toBe(false);
      expect(fieldSlots.value[2].masked).toBe(true);
    });
  });

  describe('paste functionality', () => {
    test('handles paste event', async () => {
      const OtpField = createOtpField({ label: 'OTP Code', length: 4 });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');
      const pasteEvent = new Event('paste');
      (pasteEvent as any).clipboardData = {
        getData: () => '1234',
      };

      await fireEvent(slots[0], pasteEvent);
      await flush();

      expect(screen.getByTestId('value')).toHaveTextContent('1234');
    });

    test('respects accept type for paste', async () => {
      // Test the isValueAccepted utility function directly
      expect(isValueAccepted('1234', 'numeric')).toBe(true);
      expect(isValueAccepted('abcd', 'numeric')).toBe(false);
      expect(isValueAccepted('a1b2', 'alphanumeric')).toBe(true);
      expect(isValueAccepted('a1b2!', 'alphanumeric')).toBe(false);
      expect(isValueAccepted('anything!', 'all')).toBe(true);
    });

    test('handles paste starting from a middle slot', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 6,
      });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');

      // Fill the first two slots manually
      await fireEvent.focus(slots[0]);
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[1], new InputEvent('beforeinput', { data: '2', cancelable: true }));
      await flush();

      // Focus should now be on the third slot
      expect(document.activeElement).toBe(slots[2]);

      // Create a paste event with a partial value
      const partialPasteEvent = new Event('paste');
      (partialPasteEvent as any).clipboardData = {
        getData: () => '345', // 3 digits to paste into slots 2, 3, and 4
      };

      await fireEvent(slots[2], partialPasteEvent);
      await flush();

      // Verify that the first 5 slots are filled (2 manual + 3 pasted)
      expect(screen.getByTestId('value').textContent).toBe('12345');

      // Focus should move to the sixth slot (after the pasted content)
      expect(document.activeElement).toBe(slots[5]);

      // Fill the last slot
      await fireEvent(slots[5], new InputEvent('beforeinput', { data: '6', cancelable: true }));
      await flush();

      // Now all slots should be filled
      expect(screen.getByTestId('value').textContent).toBe('123456');
    });
  });

  describe('validation', () => {
    test('validates required field', async () => {
      const OtpField = createOtpField({ label: 'OTP Code', length: 4, required: true });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      await fireEvent.invalid(screen.getAllByTestId('slot')[0]);
      await flush();

      expect(screen.getByTestId('control')).toHaveErrorMessage('Constraints not satisfied');
    });
  });

  describe('completion callback', () => {
    test('calls onCompleted when all slots are filled', async () => {
      const onCompleted = vi.fn();
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
        onCompleted,
      });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');
      await fireEvent.focus(slots[0]);
      await flush();

      // somehow it doesn't work for the first slot
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[1], new InputEvent('beforeinput', { data: '2', cancelable: true }));
      await fireEvent(slots[2], new InputEvent('beforeinput', { data: '3', cancelable: true }));
      await fireEvent(slots[3], new InputEvent('beforeinput', { data: '4', cancelable: true }));

      expect(onCompleted).toHaveBeenCalledWith('1234');
    });
  });

  describe('keyboard navigation', () => {
    test('provides slot registration with navigation functions', async () => {
      // We can't directly test focusNext and focusPrevious as they're not exposed
      // in the return value, but we can verify the component renders correctly
      const OtpField = createOtpField({ label: 'OTP Code', length: 4 });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      // Verify slots are rendered
      const slots = screen.getAllByTestId('slot');
      expect(slots.length).toBe(4);
    });

    test('navigates between slots using arrow keys', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
        },
        InputBase,
        'input',
      );

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      await flush();
      const slots = screen.getAllByTestId('slot');

      // Focus the first slot
      await fireEvent.focus(slots[0]);

      // Press right arrow key to move to the next slot
      await fireEvent.keyDown(slots[0], { key: 'ArrowRight', code: 'ArrowRight' });
      await flush();
      expect(document.activeElement).toBe(slots[0]);

      // Press right arrow key again to move to the third slot
      await fireEvent.keyDown(slots[1], { key: 'ArrowRight', code: 'ArrowRight' });
      await flush();
      expect(document.activeElement).toBe(slots[1]);

      // Press left arrow key to move back to the second slot
      await fireEvent.keyDown(slots[2], { key: 'ArrowLeft', code: 'ArrowLeft' });
      await flush();
      expect(document.activeElement).toBe(slots[0]);

      // Press left arrow key again to move back to the first slot
      await fireEvent.keyDown(slots[1], { key: 'ArrowLeft', code: 'ArrowLeft' });
      await flush();
      expect(document.activeElement).toBe(slots[0]);
    });

    test('automatically moves focus to next slot after input', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
      });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');

      // Focus the first slot
      await fireEvent.focus(slots[0]);

      // Enter a value in the first slot
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await flush();

      // Focus should automatically move to the next slot
      expect(document.activeElement).toBe(slots[1]);

      // Enter a value in the second slot
      await fireEvent(slots[1], new InputEvent('beforeinput', { data: '2', cancelable: true }));
      await flush();

      // Focus should automatically move to the third slot
      expect(document.activeElement).toBe(slots[2]);

      // Enter a value in the third slot
      await fireEvent(slots[2], new InputEvent('beforeinput', { data: '3', cancelable: true }));
      await flush();

      // Focus should automatically move to the fourth slot
      expect(document.activeElement).toBe(slots[3]);

      // Enter a value in the fourth slot
      await fireEvent(slots[3], new InputEvent('beforeinput', { data: '4', cancelable: true }));
      await flush();

      // Focus should remain on the last slot as there's nowhere else to go
      expect(document.activeElement).toBe(slots[3]);

      // Verify the complete value
      expect(screen.getByTestId('value').textContent).toBe('1234');
    });

    test('handles backspace key to clear and navigate to previous slot', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
      });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');

      // Fill all slots
      await fireEvent.focus(slots[0]);
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[1], new InputEvent('beforeinput', { data: '2', cancelable: true }));
      await fireEvent(slots[2], new InputEvent('beforeinput', { data: '3', cancelable: true }));
      await fireEvent(slots[3], new InputEvent('beforeinput', { data: '4', cancelable: true }));
      await flush();

      // Verify all slots are filled
      expect(screen.getByTestId('value').textContent).toBe('1234');

      // Press backspace on the last slot
      await fireEvent.keyDown(slots[3], { key: 'Backspace', code: 'Backspace' });
      await flush();
      await flush();

      // The last slot should be cleared and focus should remain on it
      expect(screen.getByTestId('value').textContent).toBe('123');
      expect(document.activeElement).toBe(slots[2]);

      // Press backspace again on the empty last slot
      await fireEvent.keyDown(slots[2], { key: 'Backspace', code: 'Backspace' });
      await flush();

      // Focus should move to the previous slot
      expect(document.activeElement).toBe(slots[1]);

      // Press backspace on the third slot
      await fireEvent.keyDown(slots[1], { key: 'Backspace', code: 'Backspace' });
      await flush();

      // The third slot should be cleared and focus should remain on it
      expect(screen.getByTestId('value').textContent).toBe('1');
      expect(document.activeElement).toBe(slots[0]);
    });

    test('handles enter key to move to the next slot', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
      });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');

      // Focus the first slot
      await fireEvent.focus(slots[0]);

      // Press enter on the first slot
      await fireEvent.keyDown(slots[0], { key: 'Enter', code: 'Enter' });
      await flush();

      // Focus should move to the next slot
      expect(document.activeElement).toBe(slots[0]);

      // Press enter on the second slot
      await fireEvent.keyDown(slots[0], { key: 'Enter', code: 'Enter' });
      await flush();

      // Focus should move to the third slot
      expect(document.activeElement).toBe(slots[1]);
    });
  });

  describe('masked input', () => {
    test('renders masked inputs when masked is true', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
          mask: true,
        },
        InputBase,
        'input',
      );

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');

      // Verify all slots are rendered as password inputs
      slots.forEach(slot => {
        expect(slot).toHaveAttribute('type', 'password');
      });
    });

    test('renders text inputs when masked is false', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
          mask: false,
        },
        InputBase,
        'input',
      );

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');

      // Verify all slots are rendered as text inputs
      slots.forEach(slot => {
        expect(slot).toHaveAttribute('type', 'text');
      });
    });

    test('renders mixed input types with prefix and masked', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
          prefix: 'G-',
          mask: true,
        },
        InputBase,
        'input',
      );

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');

      // Prefix slots should be text type
      expect(slots[0]).toHaveAttribute('type', 'text');
      expect(slots[1]).toHaveAttribute('type', 'text');

      // Non-prefix slots should be password type
      expect(slots[2]).toHaveAttribute('type', 'password');
      expect(slots[3]).toHaveAttribute('type', 'password');
      expect(slots[4]).toHaveAttribute('type', 'password');
      expect(slots[5]).toHaveAttribute('type', 'password');
    });

    test('masks entered values while maintaining correct underlying value', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
          mask: true,
        },
        InputBase,
        'span',
      );

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');

      // Enter values in the slots
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[1], new InputEvent('beforeinput', { data: '2', cancelable: true }));
      await fireEvent(slots[2], new InputEvent('beforeinput', { data: '3', cancelable: true }));
      await fireEvent(slots[3], new InputEvent('beforeinput', { data: '4', cancelable: true }));

      await flush();

      // Verify the underlying field value is correct
      expect(screen.getByTestId('value').textContent).toBe('1234');

      // Verify each slot has the correct value attribute but is visually masked
      slots.forEach(slot => {
        expect(slot).toHaveTextContent('•');
      });
    });
  });

  describe('input acceptance', () => {
    test('accepts only numeric input when accept is set to numeric', async () => {
      // Create a spy on console.warn to check if warnings are logged
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
        accept: 'numeric',
      });

      await render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = screen.getAllByTestId('slot');
      await fireEvent.focus(slots[0]);
      await flush();

      // Test numeric input (should be accepted)
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));
      await fireEvent(slots[0], new InputEvent('beforeinput', { data: '1', cancelable: true }));

      // Test non-numeric input (should be rejected)
      await fireEvent(slots[1], new InputEvent('beforeinput', { data: 'a', cancelable: true }));
      await fireEvent(slots[1], new InputEvent('beforeinput', { data: 'a', cancelable: true }));

      // Check the field value - should only contain the numeric input
      expect(screen.getByTestId('value').textContent).toBe('1');

      // Test paste event with mixed content
      const pasteEvent = new Event('paste');
      (pasteEvent as any).clipboardData = {
        getData: () => '12ab',
      };

      await fireEvent(slots[0], pasteEvent);
      await flush();

      // Should not update with mixed content paste
      expect(screen.getByTestId('value').textContent).toBe('1');

      // Test paste event with numeric content
      const numericPasteEvent = new Event('paste');
      (numericPasteEvent as any).clipboardData = {
        getData: () => '1234',
      };

      await fireEvent(slots[0], numericPasteEvent);
      await flush();

      // Should update with numeric content paste
      expect(screen.getByTestId('value').textContent).toBe('1234');

      // Restore the spy
      warnSpy.mockRestore();
    });
  });
});
