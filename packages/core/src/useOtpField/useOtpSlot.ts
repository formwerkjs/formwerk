import { computed, defineComponent, h, inject, ref, toValue } from 'vue';
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

  const context = inject(OtpContextKey, {
    useSlotRegistration() {
      return {
        id: '',
        focusNext: () => {},
        focusPrevious: () => {},
        setValue: () => {},
        handlePaste: () => {},
      };
    },
  });

  const { focusNext, focusPrevious, setValue, id, handlePaste } = context.useSlotRegistration({
    focus() {
      slotEl.value?.focus();
    },
  });

  if (!context) {
    if (__DEV__) {
      warn('OtpSlot must be used within an OtpField');
    }
  }

  function withMask(value: string | undefined) {
    if (!toValue(props.masked) || !value) {
      return value ?? '';
    }

    return '•'.repeat(value.length);
  }

  function setElementValue(value: string) {
    if (!slotEl.value) {
      return;
    }

    setValue(value);
    if (isInputElement(slotEl.value)) {
      slotEl.value.value = value;
      return;
    }

    slotEl.value.textContent = withMask(value);
  }

  const handlers = {
    onPaste(e: ClipboardEvent) {
      handlePaste(e);
    },
    onKeydown(e: KeyboardEvent) {
      if (hasKeyCode(e, 'Backspace') || hasKeyCode(e, 'Delete')) {
        blockEvent(e);
        setElementValue('');
        focusPrevious();
        return;
      }

      if (hasKeyCode(e, 'Enter')) {
        blockEvent(e);
        focusNext();
        return;
      }

      if (hasKeyCode(e, 'ArrowLeft')) {
        blockEvent(e);
        focusPrevious();
        return;
      }

      if (hasKeyCode(e, 'ArrowRight')) {
        blockEvent(e);
        focusNext();
        return;
      }
    },
    onBeforeinput(e: InputEvent) {
      // Ignores non printable keys
      if (!e.data) {
        return;
      }

      blockEvent(e);
      if (isValueAccepted(e.data, toValue(props.accept) || 'all')) {
        setElementValue(e.data);
        focusNext();
      }
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
      autocomplete: 'off',
      autocapitalize: 'off',
      // TODO: Should be either done or next depending on if it's the last slot
      enterkeyhint: 'next',
      ...handlers,
      style: {
        caretColor: 'transparent',
      },
    };

    if (toValue(props.accept) === 'numeric') {
      baseProps.inputmode = 'numeric';
    }

    if (!isInput) {
      baseProps['aria-role'] = 'textbox';
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
    key: id,
    value: computed(() => withMask(toValue(props.value))),
  };
}

/**
 * A helper component that renders an OTP slot. You can build your own with `useOtpSlot`.
 */
export const OtpSlot = /*#__PURE__*/ defineComponent<OtpSlotProps>({
  name: 'OtpSlot',
  props: ['value', 'disabled', 'readonly', 'accept', 'masked'],
  setup(props) {
    const { slotProps, value, key } = useOtpSlot(props);

    return () => h('span', { ...slotProps.value, key }, value.value);
  },
});
