import { computed, nextTick, shallowRef, toValue, watch } from 'vue';
import {
  fromNumberish,
  isEmpty,
  isNullOrUndefined,
  normalizeProps,
  propsToValues,
  useUniqId,
  useCaptureProps,
} from '../utils/common';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  InputEvents,
  AriaValidatableProps,
  Numberish,
  ControlProps,
  Reactivify,
} from '../types';
import { useInputValidity } from '../validation/useInputValidity';
import { useNumberParser } from '../i18n/useNumberParser';
import { useSpinButton } from '../useSpinButton';
import { useLocale } from '../i18n';
import { resolveFieldState } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useEventListener } from '../helpers/useEventListener';
import { TransparentWrapper } from '../types';
import { useVModelProxy } from '../reactivity/useVModelProxy';
import { useFieldControllerContext } from '../useFormField/useFieldController';
import { registerField } from '@formwerk/devtools';

export interface NumberInputDOMAttributes {
  name?: string;
}

export interface NumberInputDOMProps
  extends NumberInputDOMAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    AriaValidatableProps,
    InputEvents {
  id: string;
}

export interface NumberControlProps extends ControlProps<number | undefined, Numberish | undefined> {
  /**
   * The locale to use for number formatting.
   */
  locale?: string;

  /**
   * The label text for the increment button.
   */
  incrementLabel?: string;

  /**
   * The label text for the decrement button.
   */
  decrementLabel?: string;

  /**
   * The minimum allowed value.
   */
  min?: Numberish;

  /**
   * The maximum allowed value.
   */
  max?: Numberish;

  /**
   * The amount to increment/decrement by.
   */
  step?: Numberish;

  /**
   * Placeholder text shown when the number field is empty.
   */
  placeholder?: string | undefined;

  /**
   * Whether the number field is readonly.
   */
  readonly?: boolean;

  /**
   * Options for number formatting.
   */
  formatOptions?: Intl.NumberFormatOptions;

  /**
   * Whether to disable mouse wheel input.
   */
  disableWheel?: boolean;

  /**
   * Whether to disable HTML5 form validation.
   */
  disableHtmlValidation?: TransparentWrapper<boolean>;
}

export function useNumberControl(_props: Reactivify<NumberControlProps, '_field' | 'schema'>) {
  const props = normalizeProps(_props, ['_field', 'schema']);
  const inputId = useUniqId(FieldTypePrefixes.NumberField);
  const inputEl = shallowRef<HTMLInputElement>();
  const controller = useFieldControllerContext(props);
  const field = resolveFieldState<number | undefined, Numberish | undefined>(
    props,
    () => toValue(props.modelValue) ?? fromNumberish(props.value),
  );
  const { locale } = useLocale(props.locale);
  const parser = useNumberParser(locale, props.formatOptions);
  const { model, setModelValue } = useVModelProxy(field);

  const isDisabled = computed(() => toValue(props.disabled) || field.isDisabled.value);
  const formattedText = shallowRef<string>('');

  const { updateValidity } = useInputValidity({
    inputEl,
    field,
    disableHtmlValidation: props.disableHtmlValidation,
  });

  controller?.registerControl({
    getControlElement: () => inputEl.value,
    getControlId: () => inputId,
  });

  watch(
    [locale, () => toValue(props.formatOptions), model],
    () => {
      if (Number.isNaN(model.value) || isEmpty(model.value)) {
        formattedText.value = '';

        return;
      }

      formattedText.value = parser.format(model.value);
    },
    { immediate: true },
  );

  const { incrementButtonProps, decrementButtonProps, increment, decrement, spinButtonProps, applyClamp } =
    useSpinButton({
      current: model,
      currentText: formattedText,
      step: props.step,
      min: props.min,
      max: props.max,
      readonly: props.readonly,
      disabled: () => isDisabled.value || toValue(props.readonly),
      incrementLabel: props.incrementLabel,
      decrementLabel: props.decrementLabel,
      orientation: 'vertical',
      preventTabIndex: true,

      onChange: value => {
        setModelValue(value);
        field.setTouched(true);
        updateValidity();
      },
    });

  const handlers: InputEvents = {
    onBeforeinput: (event: Event) => {
      const inputEvent = event as InputEvent;
      // No data,like backspace or whatever
      if (isNullOrUndefined(inputEvent.data)) {
        return;
      }

      const el = inputEvent.target as HTMLInputElement;
      // Kind of predicts the next value of the input by appending the new data
      const nextValue =
        el.value.slice(0, el.selectionStart ?? undefined) +
        inputEvent.data +
        el.value.slice(el.selectionEnd ?? undefined);

      const isValid = parser.isValidNumberPart(nextValue);
      if (!isValid) {
        inputEvent.preventDefault();
        inputEvent.stopPropagation();
        return;
      }
    },
    onChange: (event: Event) => {
      setModelValue(applyClamp(parser.parse((event.target as HTMLInputElement).value)));
      nextTick(() => {
        if (inputEl.value && inputEl.value?.value !== formattedText.value) {
          inputEl.value.value = formattedText.value;
        }
      });
    },
    onBlur: () => {
      field.setTouched(true);
    },
  };

  const inputMode = computed(() => {
    const intlOpts = toValue(props.formatOptions);
    const step = fromNumberish(props.step) || 1;
    const hasDecimals = (intlOpts?.maximumFractionDigits ?? 0) > 0 || String(step).includes('.');

    if (hasDecimals) {
      return 'decimal';
    }

    return 'numeric';
  });

  const inputProps = useCaptureProps<NumberInputDOMProps>(() => {
    return {
      ...propsToValues(props, ['name', 'placeholder', 'required', 'readonly']),
      ...controller?.labelledByProps.value,
      ...controller?.describedByProps.value,
      ...controller?.accessibleErrorProps.value,
      ...handlers,
      onKeydown: spinButtonProps.value.onKeydown,
      id: inputId,
      inputmode: inputMode.value,
      value: formattedText.value,
      disabled: isDisabled.value ? true : undefined,
      max: toValue(props.max),
      min: toValue(props.min),
      type: 'text',
      spellcheck: false,
    };
  }, inputEl);

  useEventListener(
    inputEl,
    'wheel',
    (e: WheelEvent) => {
      if (e.deltaY > 0) {
        increment();
        return;
      }

      decrement();
    },
    { disabled: () => isDisabled.value || toValue(props.disableWheel), passive: true },
  );

  if (__DEV__) {
    registerField(field, 'Number');
  }

  return {
    /**
     * The id of the input element.
     */
    controlId: inputId,

    /**
     * Decrements the number field value.
     */
    decrement,
    /**
     * Props for the decrement button.
     */
    decrementButtonProps,

    /**
     * Increments the number field value.
     */
    increment,
    /**
     * Props for the increment button.
     */
    incrementButtonProps,
    /**
     * Reference to the input element.
     */
    inputEl,

    /**
     * Props for the input element.
     */
    inputProps,

    /**
     * The formatted text of the number field.
     */
    formattedText,

    /**
     * The field state.
     */
    field,
  };
}
