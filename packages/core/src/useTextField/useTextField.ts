import { Ref, computed, shallowRef, toValue } from 'vue';
import {
  createAccessibleErrorMessageProps,
  createDescribedByProps,
  normalizeProps,
  propsToValues,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  TextInputBaseAttributes,
  InputEvents,
  AriaValidatableProps,
  Numberish,
  Reactivify,
} from '../types/common';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useErrorDisplay } from '../useFormField/useErrorDisplay';
import { TypedSchema } from '../types';

export type TextInputDOMType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';

export interface TextInputDOMAttributes extends TextInputBaseAttributes {
  type?: TextInputDOMType;
}

export interface TextInputDOMProps
  extends TextInputDOMAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    AriaValidatableProps,
    InputEvents {
  id: string;
}

export interface TextFieldProps {
  label: string;
  modelValue?: string;
  description?: string;

  // TODO: Vue cannot resolve these types if they are mapped from up there
  name?: string;
  value?: string;
  type?: TextInputDOMType;
  maxLength?: Numberish;
  minLength?: Numberish;
  pattern?: string | undefined;
  placeholder?: string | undefined;

  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;

  schema?: TypedSchema<string>;

  disableHtmlValidation?: boolean;
}

export function useTextField(
  _props: Reactivify<TextFieldProps, 'schema'>,
  elementRef?: Ref<HTMLInputElement | HTMLTextAreaElement>,
) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.TextField);
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const field = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { validityDetails } = useInputValidity({ inputRef, field, disableHtmlValidation: props.disableHtmlValidation });
  const { displayError } = useErrorDisplay(field);
  const { fieldValue, setValue, isTouched, setTouched, errorMessage, isValid, errors, setErrors } = field;
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

  const handlers: InputEvents = {
    onInput(evt) {
      setValue((evt.target as HTMLInputElement).value);
    },
    onChange(evt) {
      setValue((evt.target as HTMLInputElement).value);
    },
    onBlur() {
      setTouched(true);
    },
  };

  const inputProps = computed<TextInputDOMProps>(() => {
    return withRefCapture(
      {
        ...propsToValues(props, ['name', 'type', 'placeholder', 'required', 'readonly', 'disabled']),
        ...labelledByProps.value,
        ...describedByProps.value,
        ...accessibleErrorProps.value,
        ...handlers,
        id: inputId,
        value: fieldValue.value,
        maxlength: toValue(props.maxLength),
        minlength: toValue(props.minLength),
        pattern: inputRef.value?.tagName === 'TEXTAREA' ? undefined : toValue(props.pattern),
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
    isTouched,
    isValid,
    errors,

    setErrors,
    setValue,
    setTouched,
    displayError,
  };
}
