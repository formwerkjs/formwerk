import { computed, defineComponent, h, inject, ref, toValue, useId } from 'vue';
import { Reactivify } from '../types';
import { hasKeyCode, isInputElement, normalizeProps, warn, withRefCapture } from '../utils/common';
import { isFirefox } from '../utils/platform';
import { blockEvent } from '../utils/events';
import { OtpContextKey, OtpSlotAcceptType } from './types';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { isValueAccepted } from './utils';

export interface OtpSlotProps {
  /**
   * The value of the slot.
   */
  value: string;

  /**
   * Whether the slot is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the slot is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the slot is masked.
   */
  masked?: boolean;

  /**
   * The type of the slot.
   */
  accept?: OtpSlotAcceptType;
}

export function useOtpSlot(_props: Reactivify<OtpSlotProps>) {
  const props = normalizeProps(_props);
  const slotEl = ref<HTMLElement>();
  const isDisabled = createDisabledContext(props.disabled);

  const context = inject(OtpContextKey, null);

  const registration = context?.useSlotRegistration();

  if (!context) {
    if (__DEV__) {
      warn('OtpSlot must be used within an OtpField');
    }
  }

  function withMask(value: string | undefined) {
    if (!toValue(props.masked) || !value) {
      return value ?? '';
    }

    return context?.getMaskCharacter().repeat(value.length) ?? '';
  }

  function setElementValue(value: string) {
    if (!slotEl.value) {
      return;
    }

    if (isInputElement(slotEl.value)) {
      slotEl.value.value = value;
      return;
    }

    slotEl.value.textContent = value;
  }

  const handlers = {
    onPaste(e: ClipboardEvent) {
      registration?.handlePaste(e);
    },
    onBlur() {
      context?.onBlur();
    },
    onKeydown(e: KeyboardEvent) {
      if (hasKeyCode(e, 'Backspace') || hasKeyCode(e, 'Delete')) {
        blockEvent(e);
        setElementValue('');
        registration?.setValue('', e);
        registration?.focusPrevious();
        return;
      }

      if (hasKeyCode(e, 'Enter')) {
        blockEvent(e);
        registration?.focusNext();
        return;
      }

      if (hasKeyCode(e, 'ArrowLeft')) {
        blockEvent(e);
        registration?.focusPrevious();
        return;
      }

      if (hasKeyCode(e, 'ArrowRight')) {
        blockEvent(e);
        registration?.focusNext();
        return;
      }
    },
    onBeforeinput(e: InputEvent) {
      // Ignores non printable keys
      if (!e.data) {
        return;
      }

      blockEvent(e);
      const text = e.data.trim();
      if (toValue(props.readonly) || isDisabled.value || !text) {
        return;
      }

      if (isValueAccepted(text, toValue(props.accept) || 'alphanumeric')) {
        // Chrome on Android bug #151
        setTimeout(() => {
          setElementValue(text);
          registration?.setValue(text, e);
        }, 0);
      }
    },
    onChange(e: Event) {
      if (!slotEl.value) {
        return;
      }

      if (isInputElement(slotEl.value)) {
        setElementValue(slotEl.value.value);
        registration?.setValue(slotEl.value.value, e);
        return;
      }

      setElementValue(slotEl.value.textContent ?? '');
      registration?.setValue(slotEl.value.textContent ?? '', e);
    },
  };

  const slotProps = computed(() => {
    const isInput = isInputElement(slotEl.value);

    const baseProps: Record<string, unknown> = {
      [isInput ? 'readonly' : 'aria-readonly']: toValue(props.readonly),
      [isInput ? 'disabled' : 'aria-disabled']: toValue(props.disabled),
      'data-otp-slot': true,
      spellcheck: false,
      tabindex: isDisabled.value ? '-1' : '0',
      autocorrect: 'off',
      autocomplete: 'one-time-code',
      autocapitalize: 'off',
      enterkeyhint: registration?.isLast() ? 'done' : 'next',
      ...handlers,
    };

    if (toValue(props.accept) === 'numeric') {
      baseProps.inputmode = 'numeric';
    }

    if (!isInput) {
      baseProps.role = 'textbox';
      baseProps['aria-label'] = toValue(props.value) || 'Enter a character';
      baseProps['aria-multiline'] = 'false';
      baseProps.contenteditable = isDisabled.value ? 'false' : isFirefox() ? 'true' : 'plaintext-only';
    } else {
      baseProps.value = toValue(props.value);
      baseProps.type = toValue(props.masked) ? 'password' : 'text';
    }

    return withRefCapture(baseProps, slotEl);
  });

  return {
    slotProps,
    key: registration?.id ?? useId(),
    value: computed(() => withMask(toValue(props.value))),
  };
}

/**
 * A helper component that renders an OTP slot. You can build your own with `useOtpSlot`.
 */
export const OtpSlot = /*#__PURE__*/ defineComponent<OtpSlotProps & { as?: string }>({
  name: 'OtpSlot',
  props: ['value', 'disabled', 'readonly', 'accept', 'masked', 'as'],
  setup(props) {
    const { slotProps, value, key } = useOtpSlot(props);

    return () => h(props.as || 'input', { ...slotProps.value, key }, value.value);
  },
});
