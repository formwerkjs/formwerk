import { Ref, computed, shallowRef, toValue } from 'vue';
import { createDescribedByProps, normalizeProps, propsToValues, uniqId, withRefCapture } from '../utils/common';
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
import { useFormField } from '../form/useFormField';

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
  const inputId = uniqId();
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const { errorMessage, validityDetails, isInvalid } = useInputValidity(inputRef);
  const { fieldValue, setValue } = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue),
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

  const handlers: InputEvents = {
    onInput: (event: Event) => {
      setValue((event.target as HTMLInputElement).value);
    },
    onChange: (event: Event) => {
      setValue((event.target as HTMLInputElement).value);
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
    isInvalid,
  };
}
