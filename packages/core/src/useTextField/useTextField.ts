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
import { StandardSchema } from '../types';
import { exposeField } from '../utils/exposers';

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
  pattern?: string | RegExp | undefined;
  placeholder?: string | undefined;

  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;

  schema?: StandardSchema<string>;

  disableHtmlValidation?: boolean;
}

export function useTextField(
  _props: Reactivify<TextFieldProps, 'schema'>,
  elementRef?: Ref<HTMLInputElement | HTMLTextAreaElement>,
) {
  const props = normalizeProps(_props, ['schema']);
  const inputId = useUniqId(FieldTypePrefixes.TextField);
  const inputEl = elementRef || shallowRef<HTMLInputElement>();
  const field = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { validityDetails } = useInputValidity({ inputEl, field, disableHtmlValidation: props.disableHtmlValidation });
  const { fieldValue, setValue, setTouched, errorMessage } = field;
  const { labelProps, labelledByProps } = useLabel({
    for: inputId,
    label: props.label,
    targetRef: inputEl,
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
        // Maybe we need to find a better way to serialize RegExp to a pattern string
        pattern: inputEl.value?.tagName === 'TEXTAREA' ? undefined : toValue(props.pattern)?.toString(),
      },
      inputEl,
      elementRef,
    );
  });

  return {
    descriptionProps,
    errorMessageProps,
    inputEl,
    inputProps,
    labelProps,
    validityDetails,
    ...exposeField(field),
  };
}
