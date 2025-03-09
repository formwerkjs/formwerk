import { computed, nextTick, provide, ref, toValue, watch } from 'vue';
import { MaybeAsync, Reactivify, StandardSchema } from '../types';
import { OtpContextKey, OtpSlotAcceptType } from './types';
import { createDescribedByProps, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { useErrorMessage, useLabel } from '../a11y';
import { exposeField, useFormField } from '../useFormField';
import { useInputValidity, useConstraintsValidator } from '../validation';
import { OtpSlotProps } from './useOtpSlot';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { registerField } from '@formwerk/devtools';
import { isValueAccepted } from './utils';
import { blockEvent } from '../utils/events';

export interface OTPFieldProps {
  /**
   * The label of the OTP field.
   */
  label: string;

  /**
   * The name of the OTP field.
   */
  name?: string;

  /**
   * The model value of the OTP field.
   */
  modelValue?: string;

  /**
   * The initial value of the OTP field.
   */
  value?: string;

  /**
   * Whether the OTP field is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the OTP field is masked.
   */
  masked?: boolean;

  /**
   * Whether the OTP field is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the OTP field is required.
   */
  required?: boolean;

  /**
   * The length of the OTP field characters.
   */
  length?: number;

  /**
   * The type of the OTP field characters.
   */
  accept?: OtpSlotAcceptType;

  /**
   * The description of the OTP field.
   */
  description?: string;

  /**
   * Schema for field validation.
   */
  schema?: StandardSchema<string>;

  /**
   * Whether to disable HTML validation.
   */
  disableHtmlValidation?: boolean;

  /**
   * The prefix of the OTP field. If you prefix your codes with a character, you can set it here (e.g "G-").
   */
  prefix?: string;

  /**
   * The callback function that is called when the OTP field is completed.
   */
  onCompleted?: (value: string) => MaybeAsync<void>;
}

export function useOtpField(_props: Reactivify<OTPFieldProps, 'schema' | 'onCompleted'>) {
  const props = normalizeProps(_props, ['schema', 'onCompleted']);
  const controlEl = ref<HTMLElement>();
  const id = useUniqId(FieldTypePrefixes.OTPField);
  const isDisabled = createDisabledContext(props.disabled);

  function withPrefix(value: string | undefined) {
    const prefix = toValue(props.prefix);
    if (!prefix) {
      return value ?? '';
    }

    value = value ?? '';
    if (value.startsWith(prefix)) {
      return value;
    }

    return `${prefix}${value}`;
  }

  function getRequiredLength() {
    const prefix = toValue(props.prefix) || '';
    const length = toValue(props.length) ?? 0;

    return prefix.length + length;
  }

  const field = useFormField<string>({
    path: props.name,
    initialValue: withPrefix(toValue(props.modelValue) ?? toValue(props.value)),
    disabled: props.disabled,
    schema: props.schema,
  });

  const inputsState = ref<string[]>(withPrefix(toValue(props.modelValue) ?? toValue(props.value)).split(''));

  const { element: inputEl } = useConstraintsValidator({
    type: 'text',
    maxLength: getRequiredLength(),
    minLength: getRequiredLength(),
    required: props.required,
    value: () => (field.fieldValue.value?.length === getRequiredLength() ? field.fieldValue.value : ''),
    source: controlEl,
  });

  const { validityDetails } = useInputValidity({
    inputEl,
    field,
    disableHtmlValidation: props.disableHtmlValidation,
  });

  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId: id,
    description: props.description,
  });

  const { labelProps, labelledByProps } = useLabel({
    label: props.label,
    targetRef: controlEl,
    for: id,
  });

  const { errorMessageProps, accessibleErrorProps } = useErrorMessage({
    inputId: id,
    errorMessage: field.errorMessage,
  });

  const controlProps = computed(() => {
    return withRefCapture(
      {
        id,
        role: 'group',
        ...labelledByProps.value,
        ...describedByProps.value,
        ...accessibleErrorProps.value,
      },
      controlEl,
    );
  });

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
    const length = prefix.length + (toValue(props.length) ?? 0);

    return Array.from({ length }, (_, index) => ({
      value: inputsState.value[index] ?? '',
      disabled: prefix.length ? prefix.length > index : isDisabled.value,
      readonly: toValue(props.readonly),
      accept: toValue(props.accept),
      masked: prefix.length <= index && toValue(props.masked),
    }));
  });

  function getActiveSlotIndex() {
    const slots = Array.from(controlEl.value?.querySelectorAll('[data-otp-slot]') ?? []) as HTMLElement[];
    const currentSlot = controlEl.value?.querySelector('[data-otp-slot]:focus') as HTMLElement | null;
    if (!currentSlot) {
      return -1;
    }

    return slots.indexOf(currentSlot);
  }

  watch(field.fieldValue, value => {
    if (!value) {
      inputsState.value = withPrefix('').split('');
      return;
    }

    const expected = withPrefix(inputsState.value.join(''));
    if (expected === value) {
      return;
    }

    inputsState.value = value.split('');
  });

  function onPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text/plain') || '';
    blockEvent(event);
    if (!text.length) {
      return;
    }

    if (!isValueAccepted(text, toValue(props.accept) || 'all')) {
      return;
    }

    const prefixed = withPrefix(text).split('');
    if (prefixed.length === getRequiredLength()) {
      prefixed.forEach((value, index) => {
        inputsState.value[index] = value;
      });

      updateFieldValue();
      return;
    }

    const currentIndex = getActiveSlotIndex();
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

    updateFieldValue();
  }

  function updateFieldValue() {
    const nextValue = inputsState.value.join('');
    const isCompleted = nextValue?.length === getRequiredLength();
    field.setValue(nextValue);
    if (isCompleted) {
      nextTick(() => {
        props.onCompleted?.(nextValue);
      });
    }
  }

  provide(OtpContextKey, {
    useSlotRegistration() {
      const slotId = useUniqId(FieldTypePrefixes.OTPSlot);

      return {
        id: slotId,
        focusNext,
        focusPrevious,
        handlePaste: onPaste,
        setValue: (value: string) => {
          const index = getActiveSlotIndex();
          if (index === -1) {
            return;
          }

          inputsState.value[index] = value;
          updateFieldValue();
        },
      };
    },
  });

  if (__DEV__) {
    registerField(field, 'OTP');
  }

  return exposeField(
    {
      /**
       * The props of the control element.
       */
      controlProps,

      /**
       * The props of the label element.
       */
      labelProps,

      /**
       * The props of the description element.
       */
      descriptionProps,

      /**
       * The validity details of the OTP field.
       */
      validityDetails,

      /**
       * The slots of the OTP field. Use this as an iterable to render with `v-for`.
       */
      fieldSlots,

      /**
       * The props of the error message element.
       */
      errorMessageProps,
    },
    field,
  );
}
