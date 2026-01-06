import { computed, nextTick, provide, ref, toValue, watch, shallowRef } from 'vue';
import { BuiltInControlTypes, ControlProps, MaybeAsync, Reactivify } from '../types';
import { OtpContextKey, OtpCellAcceptType } from './types';
import { normalizeProps, useUniqId, useCaptureProps } from '../utils/common';
import { FieldTypePrefixes } from '../constants';
import { resolveFieldState } from '../useFormField';
import { useInputValidity, useConstraintsValidator } from '../validation';
import { OtpCellProps } from './useOtpCell';
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
  accept?: OtpCellAcceptType;

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

      const cells = Array.from(controlEl.value.querySelectorAll('[data-otp-cell][tabindex="0"]')) as HTMLElement[];
      const currentCell = controlEl.value.querySelector('[data-otp-cell]:focus') as HTMLElement | null;
      if (!currentCell) {
        cells[0]?.focus();
        return;
      }

      const currentIndex = cells.indexOf(currentCell);
      if (currentIndex === -1) {
        cells[0]?.focus();
        return;
      }

      const nextCell = cells[currentIndex + (direction === 'next' ? 1 : -1)];
      nextCell?.focus();
    };
  }

  const focusNext = createFocusHandler('next');
  const focusPrevious = createFocusHandler('previous');

  const fieldCells = computed<OtpCellProps[]>(() => {
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

  function getActiveCellIndex(event: Event) {
    const currentCell = (event.target as HTMLElement).closest('[data-otp-cell]') as HTMLElement | null;
    const cells = Array.from(controlEl.value?.querySelectorAll('[data-otp-cell]') ?? []) as HTMLElement[];
    if (!currentCell) {
      return -1;
    }

    return cells.indexOf(currentCell);
  }

  function focusIndex(index: number) {
    const cells = Array.from(controlEl.value?.querySelectorAll('[data-otp-cell]') ?? []) as HTMLElement[];

    cells[index]?.focus();
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

    fillCells(text, event);
  }

  function fillCells(text: string, event: Event) {
    field.setTouched(true);
    text = text.trim();
    if (!text.length) {
      const currentIndex = getActiveCellIndex(event);
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

      // Focuses the last cell
      focusIndex(getRequiredLength() - 1);
      updateFieldValue();
      return;
    }

    const currentIndex = getActiveCellIndex(event);
    if (currentIndex === -1) {
      return;
    }

    // Fill input states starting from the active index
    const prefixLength = (toValue(props.prefix) || '').length;
    const maxLength = getRequiredLength();
    const availableCells = maxLength - currentIndex;

    // Only take characters that can fit in the remaining cells
    const textToFill = text.slice(0, availableCells);

    // Skip prefix cells if we're pasting into a position after the prefix
    if (currentIndex >= prefixLength) {
      for (let i = 0; i < textToFill.length; i++) {
        const char = textToFill[i];
        inputsState.value[currentIndex + i] = char;
      }
    }

    focusIndex(Math.min(currentIndex + textToFill.length, getRequiredLength() - 1));
    // Focuses the next cell
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

  let registeredCells = 0;

  provide(OtpContextKey, {
    getMaskCharacter: () => {
      const mask = toValue(props.mask);

      return typeof mask === 'string' ? mask[0] : DEFAULT_MASK;
    },
    useCellRegistration() {
      const cellId = useUniqId(FieldTypePrefixes.OtpCell);
      const index = registeredCells++;

      return {
        id: cellId,
        focusNext,
        focusPrevious,
        setTouched: field.setTouched,
        isLast() {
          return index === getRequiredLength() - 1;
        },
        handlePaste: onPaste,
        setValue: fillCells,
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
     * The cells of the OTP field. Use this as an iterable to render with `v-for`.
     */
    fieldCells,

    /**
     * The field state.
     */
    field,
  };
}
