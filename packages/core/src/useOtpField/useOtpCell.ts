import { computed, defineComponent, h, inject, toValue, useId, shallowRef } from 'vue';
import { Reactivify } from '../types';
import { hasKeyCode, isInputElement, normalizeProps, warn, useCaptureProps } from '../utils/common';
import { isFirefox } from '../utils/platform';
import { blockEvent } from '../utils/events';
import { OtpContextKey, OtpCellAcceptType } from './types';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { isValueAccepted } from './utils';

export interface OtpCellProps {
  /**
   * The value of the cell.
   */
  value: string;

  /**
   * Whether the cell is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the cell is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the cell is masked.
   */
  masked?: boolean;

  /**
   * The type of the cell.
   */
  accept?: OtpCellAcceptType;
}

export function useOtpCell(_props: Reactivify<OtpCellProps>) {
  const props = normalizeProps(_props);
  const cellEl = shallowRef<HTMLElement>();
  const isDisabled = createDisabledContext(props.disabled);

  const context = inject(OtpContextKey, null);

  const registration = context?.useCellRegistration();

  if (!context) {
    if (__DEV__) {
      warn('OtpCell must be used within an OtpField');
    }
  }

  function withMask(value: string | undefined) {
    if (!toValue(props.masked) || !value) {
      return value ?? '';
    }

    return context?.getMaskCharacter().repeat(value.length) ?? '';
  }

  function setElementValue(value: string) {
    if (!cellEl.value) {
      return;
    }

    if (isInputElement(cellEl.value)) {
      cellEl.value.value = value;
      return;
    }

    cellEl.value.textContent = value;
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
        if (isDisabled.value || toValue(props.readonly)) {
          return;
        }

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
      if (!cellEl.value) {
        return;
      }

      if (isInputElement(cellEl.value)) {
        setElementValue(cellEl.value.value);
        registration?.setValue(cellEl.value.value, e);
        return;
      }

      setElementValue(cellEl.value.textContent ?? '');
      registration?.setValue(cellEl.value.textContent ?? '', e);
    },
  };

  const cellProps = useCaptureProps(() => {
    const isInput = isInputElement(cellEl.value);

    const baseProps: Record<string, unknown> = {
      [isInput ? 'readonly' : 'aria-readonly']: toValue(props.readonly),
      [isInput ? 'disabled' : 'aria-disabled']: toValue(props.disabled),
      'data-otp-cell': true,
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

    return baseProps;
  }, cellEl);

  return {
    cellProps,
    key: registration?.id ?? useId(),
    value: computed(() => withMask(toValue(props.value))),
  };
}

/**
 * A helper component that renders an OTP cell. You can build your own with `useOtpCell`.
 */
export const OtpCell = /*#__PURE__*/ defineComponent<OtpCellProps & { as?: string }>({
  name: 'OtpCell',
  props: ['value', 'disabled', 'readonly', 'accept', 'masked', 'as'],
  setup(props) {
    const { cellProps, value, key } = useOtpCell(props);

    return () => h(props.as || 'input', { ...cellProps.value, key }, value.value);
  },
});
