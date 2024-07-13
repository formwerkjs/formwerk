import { Ref, computed, nextTick, shallowRef, toValue } from 'vue';
import { createDescribedByProps, propsToValues, uniqId, withRefCapture } from '../utils/common';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  InputEvents,
  AriaValidatableProps,
  Numberish,
  Reactivify,
} from '../types/common';
import { useSyncModel } from '../composables/useModelSync';
import { useInputValidity } from '../composables/useInputValidity';
import { useLabel } from '../composables/useLabel';
import { useFieldValue } from '../composables/useFieldValue';
import { useNumberFormatOptions } from '../composables/useLocale';
import { useNumberParser } from '../utils/numbers';
import { useSpinButton } from '../useSpinButton';

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
  label: string;
  locale?: string;
  modelValue?: number;
  description?: string;

  incrementLabel?: string;
  decrementLabel?: string;

  name?: string;
  value?: number;
  min?: Numberish;
  max?: Numberish;
  step?: Numberish;
  placeholder?: string | undefined;

  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;

  formatOptions?: Intl.NumberFormatOptions;
}

export function useNumberField(
  props: Reactivify<NumberFieldProps>,
  elementRef?: Ref<HTMLInputElement | HTMLTextAreaElement>,
) {
  const inputId = uniqId();
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const { fieldValue } = useFieldValue<number>(toValue(props.modelValue));
  const { errorMessage, onInvalid, updateValidity, validityDetails, isInvalid } = useInputValidity(inputRef);
  const { locale, formatOptions } = useNumberFormatOptions();

  const parser = useNumberParser(
    () => toValue(props.locale) || locale,
    () => toValue(props.formatOptions) ?? formatOptions,
  );

  const formattedText = computed(() => {
    if (Number.isNaN(fieldValue.value) || fieldValue.value === undefined) {
      return '';
    }

    return parser.format(fieldValue.value);
  });

  useSyncModel({
    model: fieldValue,
    onModelPropUpdated: value => {
      fieldValue.value = value;
    },
  });

  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputRef,
  });

  const { errorMessageProps, descriptionProps, describedBy } = createDescribedByProps({
    inputId,
    errorMessage,
    description: props.description,
  });

  const { incrementButtonProps, decrementButtonProps, increment, decrement, spinButtonProps, applyClamp } =
    useSpinButton({
      current: fieldValue,
      currentText: formattedText,
      step: props.step,
      min: props.min,
      max: props.max,
      readonly: props.readonly,
      disabled: props.disabled,
      incrementLabel: props.incrementLabel,
      decrementLabel: props.decrementLabel,
      orientation: 'vertical',
      preventTabIndex: true,

      onChange: value => {
        fieldValue.value = value;
      },
    });

  const handlers: InputEvents = {
    onBeforeinput: (event: InputEvent) => {
      // No data,like backspace or whatever
      if (event.data === null) {
        return;
      }

      const el = event.target as HTMLInputElement;
      // Kind of predicts the next value of the input by appending the new data
      const nextValue =
        el.value.slice(0, el.selectionStart ?? undefined) + event.data + el.value.slice(el.selectionEnd ?? undefined);

      const isValid = parser.isValidNumberPart(nextValue);
      if (!isValid) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    },
    onChange: (event: Event) => {
      fieldValue.value = applyClamp(parser.parse((event.target as HTMLInputElement).value));
      updateValidity();
      nextTick(() => {
        if (inputRef.value && inputRef.value?.value !== formattedText.value) {
          inputRef.value.value = formattedText.value;
        }
      });
    },
    onBlur() {
      updateValidity();
    },
    onInvalid,
  };

  const inputMode = computed(() => {
    const intlOpts = toValue(props.formatOptions);
    const step = Number(toValue(props.step)) || 1;
    const hasDecimals = (intlOpts?.maximumFractionDigits ?? 0) > 0 || (step > 0 && step < 1);

    if (hasDecimals) {
      return 'decimal';
    }

    return 'numeric';
  });

  const inputProps = computed<NumberInputDOMProps>(() => {
    return withRefCapture(
      {
        ...propsToValues(props, ['name', 'placeholder', 'required', 'readonly', 'disabled']),
        ...labelledByProps.value,
        ...spinButtonProps.value,
        ...handlers,
        id: inputId,
        inputmode: inputMode.value,
        value: formattedText.value,
        max: toValue(props.max),
        min: toValue(props.min),
        'aria-describedby': describedBy(),
        'aria-invalid': errorMessage.value ? true : undefined,
        type: 'text',
        spellcheck: false,
      },
      inputRef,
      elementRef,
    );
  });

  return {
    inputRef,
    inputProps,
    labelProps,
    fieldValue,
    errorMessage,
    errorMessageProps,
    descriptionProps,
    validityDetails,
    isInvalid,
    incrementButtonProps,
    decrementButtonProps,
    increment,
    decrement,
  };
}
