import { computed, nextTick, provide, ref, toValue, watch, shallowRef } from 'vue';
import { BuiltInControlTypes, ControlProps, MaybeAsync, Reactivify } from '../types';
import { OtpContextKey, OtpSlotAcceptType } from './types';
import { normalizeProps, useUniqId, useCaptureProps } from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { resolveFieldState } from '../useFormField';
import { useInputValidity, useConstraintsValidator } from '../validation';
import { OtpSlotProps } from './useOtpSlot';
import { DEFAULT_MASK, getOtpValue, isValueAccepted, withPrefix } from './utils';
import { blockEvent } from '../utils/events';
import { useVModelProxy } from '../reactivity/useVModelProxy';
import { useFieldControllerContext } from '../useFormField/useFieldController';

export interface OtpControlProps extends ControlProps<string | undefined> {
  /**
   * Whether the OTP field is masked.
   */
  mask?: boolean | string;

  /**
   * Whether the OTP field is readonly.
   */
  readonly?: boolean;

  /**
   * The length of the OTP field characters.
   */
  length?: number;

  /**
   * The type of the OTP field characters.
   */
  accept?: OtpSlotAcceptType;

  /**
   * Whether to disable HTML validation.
   */
  disableHtmlValidation?: Boolean;

  /**
   * The prefix of the OTP field. If you prefix your codes with a character, you can set it here (e.g "G-").
   */
  prefix?: string;

  /**
   * The callback function that is called when the OTP field is completed.
   */
  onCompleted?: (value: string) => MaybeAsync<void>;
}

type ExcludedProps = 'onCompleted' | '_field' | 'schema';

export function useOtpControl(_props: Reactivify<OtpControlProps, ExcludedProps>) {
  const props = normalizeProps(_props, ['onCompleted', '_field', 'schema']);
  const controlEl = shallowRef<HTMLElement>();
  const id = useUniqId(FieldTypePrefixes.OTPField);
  const field = resolveFieldState<string | undefined>(props, getOtpValue(props));
  const controller = useFieldControllerContext(props);
  const { model, setModelValue } = useVModelProxy(field);
  const isDisabled = computed(() => toValue(props.disabled) || field.isDisabled.value);

  const { element: inputEl } = useConstraintsValidator({
    type: 'text',
    maxLength: getRequiredLength(),
    minLength: getRequiredLength(),
    required: props.required,
    value: () => (model.value?.length === getRequiredLength() ? model.value : ''),
    source: controlEl,
  });

  useInputValidity({
    field,
    inputEl: inputEl,
    disableHtmlValidation: props.disableHtmlValidation,
  });

  controller?.registerControl({
    getControlElement: () => controlEl.value,
    getControlId: () => id,
    getControlType: () => BuiltInControlTypes.OTP,
  });

  function getRequiredLength() {
    const prefix = toValue(props.prefix) || '';
    const length = getLength();

    return prefix.length + length;
  }

  function getLength() {
    const propLength = toValue(props.length);
    if (propLength) {
      return propLength;
    }

    const prefix = toValue(props.prefix);

    return prefix ? 4 : 6;
  }

  const inputsState = ref<string[]>(
    withPrefix(toValue(props.modelValue) ?? toValue(props.value), props.prefix).split(''),
  );

  const controlProps = useCaptureProps(() => {
    return {
      id,
      role: 'group',
      ...controller?.labelledByProps.value,
      ...controller?.describedByProps.value,
      ...controller?.accessibleErrorProps.value,
    };
  }, controlEl);

  function createFocusHandler(direction: 'next' | 'previous') {
    return () => {
      if (!controlEl.value) {
        return;
      }

      const slots = Array.from(controlEl.value.querySelectorAll('[data-otp-slot][tabindex="0"]')) as HTMLElement[];
      const currentSlot = controlEl.value.querySelector('[data-otp-slot]:focus') as HTMLElement | null;
      if (!currentSlot) {
        slots[0]?.focus();
        return;
      }

      const currentIndex = slots.indexOf(currentSlot);
      if (currentIndex === -1) {
        slots[0]?.focus();
        return;
      }

      const nextSlot = slots[currentIndex + (direction === 'next' ? 1 : -1)];
      nextSlot?.focus();
    };
  }

  const focusNext = createFocusHandler('next');
  const focusPrevious = createFocusHandler('previous');

  const fieldSlots = computed<OtpSlotProps[]>(() => {
    const prefix = toValue(props.prefix) || '';
    const length = prefix.length + getLength();

    return Array.from({ length }, (_, index) => ({
      value: inputsState.value[index] ?? '',
      disabled: prefix.length ? prefix.length > index : isDisabled.value,
      readonly: toValue(props.readonly),
      accept: toValue(props.accept),
      masked: prefix.length <= index && !!toValue(props.mask),
    }));
  });

  function getActiveSlotIndex(event: Event) {
    const currentSlot = (event.target as HTMLElement).closest('[data-otp-slot]') as HTMLElement | null;
    const slots = Array.from(controlEl.value?.querySelectorAll('[data-otp-slot]') ?? []) as HTMLElement[];
    if (!currentSlot) {
      return -1;
    }

    return slots.indexOf(currentSlot);
  }

  function focusIndex(index: number) {
    const slots = Array.from(controlEl.value?.querySelectorAll('[data-otp-slot]') ?? []) as HTMLElement[];

    slots[index]?.focus();
  }

  watch(model, value => {
    if (!value) {
      inputsState.value = withPrefix('', props.prefix).split('');
      return;
    }

    const expected = withPrefix(inputsState.value.join(''), props.prefix);
    if (expected === value) {
      return;
    }

    inputsState.value = value.split('');
  });

  function onPaste(event: ClipboardEvent) {
    if (toValue(props.readonly) || isDisabled.value) {
      blockEvent(event);
      return;
    }

    const text = event.clipboardData?.getData('text/plain') || '';
    blockEvent(event);

    fillSlots(text, event);
  }

  function fillSlots(text: string, event: Event) {
    field.setTouched(true);
    text = text.trim();
    if (!text.length) {
      const currentIndex = getActiveSlotIndex(event);
      if (currentIndex === -1) {
        return;
      }

      inputsState.value[currentIndex] = '';
      updateFieldValue();
      return;
    }

    if (!isValueAccepted(text, toValue(props.accept) || 'alphanumeric')) {
      return;
    }

    const prefixed = withPrefix(text, props.prefix).split('');
    if (prefixed.length === getRequiredLength()) {
      prefixed.forEach((value, index) => {
        inputsState.value[index] = value;
      });

      // Focuses the last slot
      focusIndex(getRequiredLength() - 1);
      updateFieldValue();
      return;
    }

    const currentIndex = getActiveSlotIndex(event);
    if (currentIndex === -1) {
      return;
    }

    // Fill input states starting from the active index
    const prefixLength = (toValue(props.prefix) || '').length;
    const maxLength = getRequiredLength();
    const availableSlots = maxLength - currentIndex;

    // Only take characters that can fit in the remaining slots
    const textToFill = text.slice(0, availableSlots);

    // Skip prefix slots if we're pasting into a position after the prefix
    if (currentIndex >= prefixLength) {
      for (let i = 0; i < textToFill.length; i++) {
        const char = textToFill[i];
        inputsState.value[currentIndex + i] = char;
      }
    }

    focusIndex(Math.min(currentIndex + textToFill.length, getRequiredLength() - 1));
    // Focuses the next slot
    updateFieldValue();
  }

  function updateFieldValue() {
    const nextValue = inputsState.value.join('');
    const isCompleted = nextValue?.length === getRequiredLength();
    setModelValue(nextValue);
    if (isCompleted) {
      nextTick(() => {
        props.onCompleted?.(nextValue);
      });
    }
  }

  let registeredSlots = 0;

  provide(OtpContextKey, {
    getMaskCharacter: () => {
      const mask = toValue(props.mask);

      return typeof mask === 'string' ? mask[0] : DEFAULT_MASK;
    },
    useSlotRegistration() {
      const slotId = useUniqId(FieldTypePrefixes.OTPSlot);
      const index = registeredSlots++;

      return {
        id: slotId,
        focusNext,
        focusPrevious,
        setTouched: field.setTouched,
        isLast() {
          return index === getRequiredLength() - 1;
        },
        handlePaste: onPaste,
        setValue: fillSlots,
      };
    },
    onBlur() {
      field.setBlurred(true);
    },
  });

  return {
    /**
     * The id of the control element.
     */
    controlId: id,

    /**
     * The props of the control element.
     */
    controlProps,

    /**
     * The slots of the OTP field. Use this as an iterable to render with `v-for`.
     */
    fieldSlots,

    /**
     * The field state.
     */
    field,
  };
}
