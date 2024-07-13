import { Ref, computed, shallowRef, toValue } from 'vue';
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
import { NumberParserOptions, useNumberParser } from '../utils/numbers';
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

  formatOptions?: NumberParserOptions;
}

export function useNumberField(
  props: Reactivify<NumberFieldProps>,
  elementRef?: Ref<HTMLInputElement | HTMLTextAreaElement>,
) {
  const inputId = uniqId();
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const { fieldValue } = useFieldValue<number>(toValue(props.modelValue));
  const { errorMessage, onInvalid, updateValidity, validityDetails, isInvalid } = useInputValidity(inputRef);

  const parser = computed(() => useNumberParser(toValue(props.formatOptions)));
  const formattedText = computed(() => {
    if (Number.isNaN(fieldValue.value) || fieldValue.value === undefined) {
      return '';
    }

    return parser.value.format(fieldValue.value);
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

      const next = parser.value.parse((event.target as HTMLInputElement).value + event.data);
      if (Number.isNaN(next)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    },
    onChange: (event: Event) => {
      fieldValue.value = applyClamp(parser.value.parse((event.target as HTMLInputElement).value));

      updateValidity();
    },
    onBlur() {
      updateValidity();
    },
    onInvalid,
  };

  const inputMode = computed(() => {
    const opts = toValue(props.formatOptions);
    const step = Number(toValue(props.step)) || 1;
    const isFractionStep = step > 0 && step < 1;

    if (opts?.maximumFractionDigits === 0 && !isFractionStep) {
      return 'numeric';
    }

    return 'decimal';
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
