import { Ref, computed, nextTick, shallowRef, toValue } from 'vue';
import {
  createDescribedByProps,
  fromNumberish,
  isEmpty,
  isNullOrUndefined,
  normalizeProps,
  propsToValues,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  InputEvents,
  AriaValidatableProps,
  Numberish,
  Reactivify,
  StandardSchema,
} from '../types';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel, useErrorMessage } from '../a11y';
import { useNumberParser } from '../i18n/useNumberParser';
import { useSpinButton } from '../useSpinButton';
import { useLocale } from '../i18n';
import { exposeField, useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useEventListener } from '../helpers/useEventListener';

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

export interface NumberFieldProps {
  /**
   * The label text for the number field.
   */
  label: string;

  /**
   * The locale to use for number formatting.
   */
  locale?: string;

  /**
   * The v-model value of the number field.
   */
  modelValue?: number;

  /**
   * The description text for the number field.
   */
  description?: string;

  /**
   * The label text for the increment button.
   */
  incrementLabel?: string;

  /**
   * The label text for the decrement button.
   */
  decrementLabel?: string;

  /**
   * The name attribute for the number field input.
   */
  name?: string;

  /**
   * The value attribute of the number field input.
   */
  value?: Numberish;

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
   * Whether the number field is required.
   */
  required?: boolean;

  /**
   * Whether the number field is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the number field is disabled.
   */
  disabled?: boolean;

  /**
   * Options for number formatting.
   */
  formatOptions?: Intl.NumberFormatOptions;

  /**
   * Schema for number field validation.
   */
  schema?: StandardSchema<number>;

  /**
   * Whether to disable mouse wheel input.
   */
  disableWheel?: boolean;

  /**
   * Whether to disable HTML5 form validation.
   */
  disableHtmlValidation?: boolean;
}

export function useNumberField(
  _props: Reactivify<NumberFieldProps, 'schema'>,
  elementRef?: Ref<HTMLInputElement | HTMLTextAreaElement>,
) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.NumberField);
  const inputEl = elementRef || shallowRef<HTMLInputElement>();
  const { locale } = useLocale(props.locale);
  const parser = useNumberParser(locale, props.formatOptions);

  const field = useFormField<number>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? fromNumberish(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { validityDetails, updateValidity } = useInputValidity({
    inputEl,
    field,
    disableHtmlValidation: props.disableHtmlValidation,
  });
  const { fieldValue, setValue, setTouched, errorMessage, isDisabled } = field;
  const formattedText = computed<string>(() => {
    if (Number.isNaN(fieldValue.value) || isEmpty(fieldValue.value)) {
      return '';
    }

    return parser.format(fieldValue.value);
  });

  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputEl,
  });

  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId,
    errorMessage,
  });

  const { incrementButtonProps, decrementButtonProps, increment, decrement, spinButtonProps, applyClamp } =
    useSpinButton({
      current: fieldValue,
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
        setValue(value);
        setTouched(true);
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
      setValue(applyClamp(parser.parse((event.target as HTMLInputElement).value)));
      nextTick(() => {
        if (inputEl.value && inputEl.value?.value !== formattedText.value) {
          inputEl.value.value = formattedText.value;
        }
      });
    },
    onBlur: () => {
      setTouched(true);
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

  const inputProps = computed<NumberInputDOMProps>(() => {
    return withRefCapture(
      {
        ...propsToValues(props, ['name', 'placeholder', 'required', 'readonly']),
        ...labelledByProps.value,
        ...describedByProps.value,
        ...accessibleErrorProps.value,
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
      },
      inputEl,
      elementRef,
    );
  });

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

  return exposeField(
    {
      /**
       * Decrements the number field value.
       */
      decrement,
      /**
       * Props for the decrement button.
       */
      decrementButtonProps,
      /**
       * Props for the description element.
       */
      descriptionProps,
      /**
       * Props for the error message element.
       */
      errorMessageProps,
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
       * Props for the label element.
       */
      labelProps,
      /**
       * Validity details for the number field.
       */
      validityDetails,
      /**
       * The formatted text of the number field.
       */
      formattedText,
    },
    field,
  );
}
