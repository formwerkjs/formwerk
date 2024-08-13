import { Ref, computed, shallowRef, toValue } from 'vue';
import { createDescribedByProps, normalizeProps, propsToValues, useUniqId, withRefCapture } from '../utils/common';
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
}

export function useTextField(
  _props: Reactivify<TextFieldProps>,
  elementRef?: Ref<HTMLInputElement | HTMLTextAreaElement>,
) {
  const props = normalizeProps(_props);
  const inputId = useUniqId(FieldTypePrefixes.TextField);
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const field = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue),
    disabled: props.disabled,
  });

  const { validityDetails } = useInputValidity({ inputRef, field });
  const { displayError } = useErrorDisplay(field);
  const { fieldValue, setValue, isTouched, setTouched, errorMessage, isValid, errors, setErrors } = field;
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
        ...handlers,
        id: inputId,
        value: fieldValue.value,
        maxlength: toValue(props.maxLength),
        minlength: toValue(props.minLength),
        pattern: inputRef.value?.tagName === 'TEXTAREA' ? undefined : toValue(props.pattern),
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
    isTouched,
    isValid,
    errors,

    setErrors,
    setValue,
    setTouched,
    displayError,
  };
}
