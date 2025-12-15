import { OtpFieldProps, useOtpField, OtpSlot } from '.';
import { DEFAULT_MASK, isValueAccepted } from './utils';
import { render } from '@testing-library/vue';
import { Component, defineComponent } from 'vue';
import { renderSetup } from '@test-utils/index';
import { page } from 'vitest/browser';
import { expectNoA11yViolations } from '@test-utils/index';

const InputBase: string = `
  <div>
    <div v-bind="controlProps" data-testid="control">
      <OtpSlot v-for="slot in fieldSlots" v-bind="slot" data-testid="slot" :as="slotType" />
    </div>

    <label v-bind="labelProps">{{ label }}</label>
    <span data-testid="error-message" v-bind="errorMessageProps">{{ errorMessage }}</span>
    <span data-testid="value">{{ fieldValue }}</span>
    <span data-testid="touched">{{ isTouched }}</span>
    <span data-testid="blurred">{{ isBlurred }}</span>
  </div>
`;

async function el(locator: any) {
  return (await locator.element()) as HTMLElement;
}

async function focus(locator: any) {
  (await el(locator)).focus();
}

async function blur(locator: any) {
  (await el(locator)).dispatchEvent(new FocusEvent('blur', { bubbles: true }));
}

async function keyDown(locator: any, code: string) {
  (await el(locator)).dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code, key: code }));
}

async function beforeInput(locator: any, data: string) {
  (await el(locator)).dispatchEvent(new InputEvent('beforeinput', { data, cancelable: true, bubbles: true }));
}

async function paste(locator: any, text: string) {
  const e = new Event('paste', { bubbles: true, cancelable: true }) as any;
  e.clipboardData = { getData: () => text };
  (await el(locator)).dispatchEvent(e);
}

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
  describe('a11y', () => {
    test('with basic configuration', async () => {
      const OtpField = createOtpField({ label: 'OTP Code', length: 4 });

      render({
        components: { OtpField },
        template: `
          <div data-testid="fixture">
            <OtpField />
          </div>
        `,
      });

      await expectNoA11yViolations('[data-testid="fixture"]');
    });
  });

  describe('initialization', () => {
    test('initializes with empty value by default', async () => {
      const { fieldValue } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4 });
      });

      expect(fieldValue.value).toBe('');
    });

    test('initializes with provided modelValue', async () => {
      const { fieldValue } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, modelValue: '1234' });
      });

      expect(fieldValue.value).toBe('1234');
    });

    test('initializes with provided value', async () => {
      const { fieldValue } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, value: '5678' });
      });

      expect(fieldValue.value).toBe('5678');
    });

    test('initializes with prefix if provided', async () => {
      const { fieldValue } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-', value: '1234' });
      });

      expect(fieldValue.value).toBe('G-1234');
    });

    test('adds prefix to value if not already present', async () => {
      const { fieldValue } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-', value: '1234' });
      });

      expect(fieldValue.value).toBe('G-1234');
    });

    test('does not duplicate prefix if already present in value', async () => {
      const { fieldValue } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-', value: 'G-1234' });
      });

      expect(fieldValue.value).toBe('G-1234');
    });
  });

  describe('field slots', () => {
    test('creates correct number of slots based on length', async () => {
      const { fieldSlots } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4 });
      });

      expect(fieldSlots.value.length).toBe(4);
    });

    test('creates correct number of slots with prefix', async () => {
      const { fieldSlots } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-' });
      });

      expect(fieldSlots.value.length).toBe(6); // 'G-' (2 chars) + 4 slots
    });

    test('prefix slots are disabled', async () => {
      const { fieldSlots } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-' });
      });

      expect(fieldSlots.value[0].disabled).toBe(true);
      expect(fieldSlots.value[1].disabled).toBe(true);
      expect(fieldSlots.value[2].disabled).toBe(false);
    });

    test('prefix slots are not masked', async () => {
      const { fieldSlots } = renderSetup(() => {
        return useOtpField({ label: 'OTP Code', length: 4, prefix: 'G-', mask: true });
      });

      expect(fieldSlots.value[0].masked).toBe(false);
      expect(fieldSlots.value[1].masked).toBe(false);
      expect(fieldSlots.value[2].masked).toBe(true);
    });
  });

  describe('blur behavior', () => {
    test('sets blurred state to true when a slot is blurred', async () => {
      const OtpField = createOtpField({ label: 'OTP Code', length: 4 });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      // Find the first slot and trigger blur
      const slot = page.getByTestId('slot').nth(0);
      await blur(slot);

      // Verify that the slot has the blurred state by checking its aria attributes
      await expect.element(page.getByTestId('blurred')).toHaveTextContent('true');
    });
  });

  describe('touched behavior', () => {
    test('sets touched state to true when a slot is manipulated', async () => {
      const OtpField = createOtpField({ label: 'OTP Code', length: 4 });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slot = page.getByTestId('slot').nth(0);
      await beforeInput(slot, '1');
      await expect.element(page.getByTestId('touched')).toHaveTextContent('true');
    });
  });

  describe('paste functionality', () => {
    test('handles paste event', async () => {
      const OtpField = createOtpField({ label: 'OTP Code', length: 4 });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slot0 = page.getByTestId('slot').nth(0);
      await paste(slot0, '1234');
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');
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

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Fill the first two slots manually
      await focus(slots.nth(0));
      await beforeInput(slots.nth(0), '1');
      await beforeInput(slots.nth(1), '2');

      // Focus should now be on the third slot
      await expect.element(slots.nth(2)).toHaveFocus();

      // Create a paste event with a partial value
      await paste(slots.nth(2), '345'); // 3 digits to paste into slots 2, 3, and 4

      // Verify that the first 5 slots are filled (2 manual + 3 pasted)
      await expect.element(page.getByTestId('value')).toHaveTextContent('12345');

      // Focus should move to the sixth slot (after the pasted content)
      await expect.element(slots.nth(5)).toHaveFocus();

      // Fill the last slot
      await beforeInput(slots.nth(5), '6');

      // Now all slots should be filled
      await expect.element(page.getByTestId('value')).toHaveTextContent('123456');
    });
  });

  describe('validation', () => {
    test('validates required field', async () => {
      const OtpField = createOtpField({ label: 'OTP Code', length: 4, required: true });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      (await page.getByTestId('slot').nth(0).element()).dispatchEvent(new Event('invalid', { bubbles: true }));
      // Native HTML validation messages vary across environments/locales.
      await expect
        .element(page.getByTestId('error-message'))
        .toHaveTextContent(/Constraints not satisfied|Please fill out this field\./);
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

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // somehow it doesn't work for the first slot
      for (let i = 0; i < 4; i++) {
        await focus(slots.nth(i));
        await beforeInput(slots.nth(i), `${i + 1}`);
      }

      await expect.poll(() => onCompleted.mock.calls[0]?.[0]).toBe('1234');
    });
  });

  describe('keyboard navigation', () => {
    test('provides slot registration with navigation functions', async () => {
      // We can't directly test focusNext and focusPrevious as they're not exposed
      // in the return value, but we can verify the component renders correctly
      const OtpField = createOtpField({ label: 'OTP Code', length: 4 });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      // Verify slots are rendered
      await expect.element(page.getByTestId('slot').nth(3)).toBeInTheDocument();
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

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Focus the first slot
      await focus(slots.nth(0));

      // Press right arrow key to move to the next slot
      await keyDown(slots.nth(0), 'ArrowRight');
      await expect.element(slots.nth(1)).toHaveFocus();

      // Press right arrow key again to move to the third slot
      await keyDown(slots.nth(1), 'ArrowRight');
      await expect.element(slots.nth(2)).toHaveFocus();

      // Press left arrow key to move back to the second slot
      await keyDown(slots.nth(2), 'ArrowLeft');
      await expect.element(slots.nth(1)).toHaveFocus();

      // Press left arrow key again to move back to the first slot
      await keyDown(slots.nth(1), 'ArrowLeft');
      await expect.element(slots.nth(0)).toHaveFocus();
    });

    test('automatically moves focus to next slot after input', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
      });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Focus the first slot
      await focus(slots.nth(0));

      // Enter a value in the first slot
      await beforeInput(slots.nth(0), '1');
      await beforeInput(slots.nth(0), '1');

      // Focus should automatically move to the next slot
      await expect.element(slots.nth(1)).toHaveFocus();

      // Enter a value in the second slot
      await beforeInput(slots.nth(1), '2');

      // Focus should automatically move to the third slot
      await expect.element(slots.nth(2)).toHaveFocus();

      // Enter a value in the third slot
      await beforeInput(slots.nth(2), '3');

      // Focus should automatically move to the fourth slot
      await expect.element(slots.nth(3)).toHaveFocus();

      // Enter a value in the fourth slot
      await beforeInput(slots.nth(3), '4');

      // Focus should remain on the last slot as there's nowhere else to go
      await expect.element(slots.nth(3)).toHaveFocus();

      // Verify the complete value
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');
    });

    test('handles backspace key to clear and navigate to previous slot', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
      });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Fill all slots
      await focus(slots.nth(0));
      await beforeInput(slots.nth(0), '1');
      await beforeInput(slots.nth(1), '2');
      await beforeInput(slots.nth(2), '3');
      await beforeInput(slots.nth(3), '4');

      // Verify all slots are filled
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Press backspace on the last slot
      await keyDown(slots.nth(3), 'Backspace');

      // The last slot should be cleared and focus should remain on it
      await expect.element(page.getByTestId('value')).toHaveTextContent('123');
      await expect.element(slots.nth(2)).toHaveFocus();

      // Press backspace again on the empty last slot
      await keyDown(slots.nth(2), 'Backspace');

      // Focus should move to the previous slot
      await expect.element(slots.nth(1)).toHaveFocus();

      // Press backspace on the third slot
      await keyDown(slots.nth(1), 'Backspace');

      // The third slot should be cleared and focus should remain on it
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');
      await expect.element(slots.nth(0)).toHaveFocus();
    });

    test('handles enter key to move to the next slot', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
      });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Focus the first slot
      await focus(slots.nth(0));

      // Press enter on the first slot
      await keyDown(slots.nth(0), 'Enter');

      // Focus should move to the next slot
      await expect.element(slots.nth(1)).toHaveFocus();

      // Press enter on the second slot
      await keyDown(slots.nth(1), 'Enter');

      // Focus should move to the third slot
      await expect.element(slots.nth(2)).toHaveFocus();
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

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      // Verify all slots are rendered as password inputs
      const slots = page.getByTestId('slot');
      await expect.element(slots.nth(0)).toHaveAttribute('type', 'password');
      await expect.element(slots.nth(1)).toHaveAttribute('type', 'password');
      await expect.element(slots.nth(2)).toHaveAttribute('type', 'password');
      await expect.element(slots.nth(3)).toHaveAttribute('type', 'password');
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

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      // Verify all slots are rendered as text inputs
      const slots = page.getByTestId('slot');
      await expect.element(slots.nth(0)).toHaveAttribute('type', 'text');
      await expect.element(slots.nth(1)).toHaveAttribute('type', 'text');
      await expect.element(slots.nth(2)).toHaveAttribute('type', 'text');
      await expect.element(slots.nth(3)).toHaveAttribute('type', 'text');
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

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      // Prefix slots should be text type
      const slots = page.getByTestId('slot');
      await expect.element(slots.nth(0)).toHaveAttribute('type', 'text');
      await expect.element(slots.nth(1)).toHaveAttribute('type', 'text');

      // Non-prefix slots should be password type
      await expect.element(slots.nth(2)).toHaveAttribute('type', 'password');
      await expect.element(slots.nth(3)).toHaveAttribute('type', 'password');
      await expect.element(slots.nth(4)).toHaveAttribute('type', 'password');
      await expect.element(slots.nth(5)).toHaveAttribute('type', 'password');
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

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Enter values in the slots
      await beforeInput(slots.nth(0), '1');
      await beforeInput(slots.nth(1), '2');
      await beforeInput(slots.nth(2), '3');
      await beforeInput(slots.nth(3), '4');

      // Verify the underlying field value is correct
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Verify each slot has the correct value attribute but is visually masked
      await expect.element(slots.nth(0)).toHaveTextContent(DEFAULT_MASK);
      await expect.element(slots.nth(1)).toHaveTextContent(DEFAULT_MASK);
      await expect.element(slots.nth(2)).toHaveTextContent(DEFAULT_MASK);
      await expect.element(slots.nth(3)).toHaveTextContent(DEFAULT_MASK);
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

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');
      await focus(slots.nth(0));

      // Test numeric input (should be accepted)
      await beforeInput(slots.nth(0), '1');

      // Test non-numeric input (should be rejected)
      await beforeInput(slots.nth(1), 'a');

      // Check the field value - should only contain the numeric input
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');

      // Test paste event with mixed content
      await paste(slots.nth(0), '12ab');

      // Should not update with mixed content paste
      await expect.element(page.getByTestId('value')).toHaveTextContent('1');

      // Test paste event with numeric content
      await paste(slots.nth(0), '1234');

      // Should update with numeric content paste
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Restore the spy
      warnSpy.mockRestore();
    });
  });

  describe('readonly and disabled state behavior', () => {
    test('prevents character deletion with backspace and delete keys when readonly', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
        modelValue: '1234',
        readonly: true,
      });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Verify initial value is set
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Focus a slot and try to delete with backspace
      await focus(slots.nth(2));
      await keyDown(slots.nth(2), 'Backspace');

      // Value should remain unchanged
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Try to delete with delete key
      await keyDown(slots.nth(2), 'Delete');

      // Value should still remain unchanged
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');
    });

    test('prevents character deletion with backspace and delete keys when disabled', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
        modelValue: '1234',
        disabled: true,
      });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Verify initial value is set
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Focus a slot and try to delete with backspace
      await focus(slots.nth(2));
      await keyDown(slots.nth(2), 'Backspace');

      // Value should remain unchanged
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Try to delete with delete key
      await keyDown(slots.nth(2), 'Delete');

      // Value should still remain unchanged
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');
    });

    test('prevents character input with beforeinput when readonly', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
        modelValue: '1234',
        readonly: true,
      });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Verify initial value is set
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Focus a slot and try to input a character
      await focus(slots.nth(1));
      await beforeInput(slots.nth(1), '9');

      // Value should remain unchanged
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');
    });

    test('prevents character input with beforeinput when disabled', async () => {
      const OtpField = createOtpField({
        label: 'OTP Code',
        length: 4,
        modelValue: '1234',
        disabled: true,
      });

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Verify initial value is set
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');

      // Focus a slot and try to input a character
      await focus(slots.nth(1));
      await beforeInput(slots.nth(1), '9');

      // Value should remain unchanged
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');
    });

    test('allows normal keyboard navigation when readonly', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
          modelValue: '1234',
          readonly: true,
        },
        InputBase,
        'input',
      );

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Focus the first slot
      await focus(slots.nth(0));

      // Test that navigation keys work and don't throw errors or change the value
      await keyDown(slots.nth(0), 'ArrowRight');
      await keyDown(slots.nth(0), 'ArrowLeft');
      await keyDown(slots.nth(0), 'Enter');

      // Value should remain unchanged throughout navigation
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');
    });

    test('allows normal keyboard navigation when disabled', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
          modelValue: '1234',
          disabled: true,
        },
        InputBase,
        'input',
      );

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Note: Disabled slots have tabindex="-1" so they can't be focused normally
      // But we can test that if somehow focused, navigation still works
      await focus(slots.nth(0));

      // Arrow navigation should still work
      await keyDown(slots.nth(0), 'ArrowRight');
      await keyDown(slots.nth(1), 'ArrowLeft');

      // Enter key navigation should still work
      await keyDown(slots.nth(0), 'Enter');

      // Value should remain unchanged throughout navigation
      await expect.element(page.getByTestId('value')).toHaveTextContent('1234');
    });

    test('readonly field correctly sets aria-readonly attribute', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
          readonly: true,
        },
        InputBase,
        'span',
      );

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Verify all slots have aria-readonly="true"
      await expect.element(slots.nth(0)).toHaveAttribute('aria-readonly', 'true');
      await expect.element(slots.nth(1)).toHaveAttribute('aria-readonly', 'true');
      await expect.element(slots.nth(2)).toHaveAttribute('aria-readonly', 'true');
      await expect.element(slots.nth(3)).toHaveAttribute('aria-readonly', 'true');
    });

    test('disabled field correctly sets aria-disabled attribute and tabindex', async () => {
      const OtpField = createOtpField(
        {
          label: 'OTP Code',
          length: 4,
          disabled: true,
        },
        InputBase,
        'span',
      );

      render({
        components: { OtpField },
        template: `<OtpField />`,
      });

      const slots = page.getByTestId('slot');

      // Verify all slots have aria-disabled="true" and tabindex="-1"
      await expect.element(slots.nth(0)).toHaveAttribute('aria-disabled', 'true');
      await expect.element(slots.nth(0)).toHaveAttribute('tabindex', '-1');
      await expect.element(slots.nth(1)).toHaveAttribute('aria-disabled', 'true');
      await expect.element(slots.nth(1)).toHaveAttribute('tabindex', '-1');
      await expect.element(slots.nth(2)).toHaveAttribute('aria-disabled', 'true');
      await expect.element(slots.nth(2)).toHaveAttribute('tabindex', '-1');
      await expect.element(slots.nth(3)).toHaveAttribute('aria-disabled', 'true');
      await expect.element(slots.nth(3)).toHaveAttribute('tabindex', '-1');
    });
  });
});
