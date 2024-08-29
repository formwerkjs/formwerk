import { Ref, computed, nextTick, shallowRef, toValue } from 'vue';
import {
  createAccessibleErrorMessageProps,
  createDescribedByProps,
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
} from '../types/common';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import { useNumberParser } from '../i18n/useNumberParser';
import { useSpinButton } from '../useSpinButton';
import { useLocale } from '../i18n/useLocale';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useErrorDisplay } from '../useFormField/useErrorDisplay';
import { TypedSchema } from '../types';

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

  schema?: TypedSchema<number>;

  disableHtmlValidation?: boolean;
}

export function useNumberField(
  _props: Reactivify<NumberFieldProps, 'schema'>,
  elementRef?: Ref<HTMLInputElement | HTMLTextAreaElement>,
) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.NumberField);
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const { locale } = useLocale();
  const parser = useNumberParser(() => toValue(props.locale) ?? locale.value, props.formatOptions);
  const field = useFormField<number>({
    path: props.name,
    initialValue: toValue(props.modelValue),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { validityDetails } = useInputValidity({ inputRef, field, disableHtmlValidation: props.disableHtmlValidation });
  const { displayError } = useErrorDisplay(field);
  const { fieldValue, setValue, setTouched, isTouched, errorMessage } = field;
  const formattedText = computed<string>(() => {
    if (Number.isNaN(fieldValue.value) || isEmpty(fieldValue.value)) {
      return '';
    }

    return parser.format(fieldValue.value);
  });

  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputRef,
  });

  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = createAccessibleErrorMessageProps({
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
      disabled: props.disabled,
      incrementLabel: props.incrementLabel,
      decrementLabel: props.decrementLabel,
      orientation: 'vertical',
      preventTabIndex: true,

      onChange: value => {
        setValue(value);
        setTouched(true);
      },
    });

  const handlers: InputEvents = {
    onBeforeinput: (event: InputEvent) => {
      // No data,like backspace or whatever
      if (isNullOrUndefined(event.data)) {
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
      setValue(applyClamp(parser.parse((event.target as HTMLInputElement).value)));
      nextTick(() => {
        if (inputRef.value && inputRef.value?.value !== formattedText.value) {
          inputRef.value.value = formattedText.value;
        }
      });
    },
    onBlur: () => {
      setTouched(true);
    },
  };

  const inputMode = computed(() => {
    const intlOpts = toValue(props.formatOptions);
    const step = Number(toValue(props.step)) || 1;
    const hasDecimals = (intlOpts?.maximumFractionDigits ?? 0) > 0 || String(step).includes('.');

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
        ...describedByProps.value,
        ...accessibleErrorProps.value,
        ...handlers,
        onKeydown: spinButtonProps.value.onKeydown,
        id: inputId,
        inputmode: inputMode.value,
        value: formattedText.value,
        max: toValue(props.max),
        min: toValue(props.min),
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
    isValid: field.isValid,
    incrementButtonProps,
    decrementButtonProps,
    isTouched,
    errors: field.errors,

    setValue,
    increment,
    decrement,
    setTouched,
    setErrors: field.setErrors,
    displayError,
  };
}