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
import { useSyncModel } from '../composables/useModelSync';
import { useInputValidity } from '../composables/useInputValidity';
import { useLabel } from '../composables/useLabel';
import { useFieldValue } from '../composables/useFieldValue';

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
  const { fieldValue } = useFieldValue<string | undefined>(props.modelValue);
  const { errorMessage, onInvalid, updateValidity, validityDetails, isInvalid } = useInputValidity(inputRef);

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

  const handlers: InputEvents = {
    onInput: (event: Event) => {
      fieldValue.value = (event.target as HTMLInputElement).value;
      updateValidity();
    },
    onChange: (event: Event) => {
      fieldValue.value = (event.target as HTMLInputElement).value;
      updateValidity();
    },
    onBlur() {
      updateValidity();
    },
    onInvalid,
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
