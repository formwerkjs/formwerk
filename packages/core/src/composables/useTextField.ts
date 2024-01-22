import { MaybeRefOrGetter, Ref, computed, ref, toValue } from 'vue';
import { createDescriptionProps, createErrorProps, createLabelProps, uniqId } from '../utils/common';
import { AriaDescribableProps, AriaLabelableProps, InputBaseAttributes, InputEvents } from '../types/common';
import { useFieldValue } from './useFieldValue';
import { useSyncModel } from './useModelSync';
import { useInputValidity } from './useInputValidity';

export type TextInputDOMType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';

export interface TextInputDOMAttributes extends InputBaseAttributes {
  name?: string;
  value?: string;
  type?: TextInputDOMType;
  maxlength?: number;
  minlength?: number;
  pattern?: string;
  placeholder?: string;
}

export interface TextInputDOMProps
  extends TextInputDOMAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    InputEvents {
  id: string;
}

export interface TextFieldProps {
  label: MaybeRefOrGetter<string>;
  modelValue: MaybeRefOrGetter<string>;
  description?: MaybeRefOrGetter<string>;

  // TODO: Vue cannot resolve these types if they are mapped from up there
  name?: MaybeRefOrGetter<string>;
  value?: MaybeRefOrGetter<string>;
  type?: MaybeRefOrGetter<TextInputDOMType>;
  maxLength?: MaybeRefOrGetter<number>;
  minLength?: MaybeRefOrGetter<number>;
  pattern?: MaybeRefOrGetter<string | undefined>;
  placeholder?: MaybeRefOrGetter<string | undefined>;

  required?: MaybeRefOrGetter<boolean>;
  readonly?: MaybeRefOrGetter<boolean>;
  disabled?: MaybeRefOrGetter<boolean>;
}

export function useTextField(props: TextFieldProps, elementRef?: Ref<HTMLInputElement>) {
  const inputId = uniqId();
  const inputRef = elementRef || ref<HTMLInputElement>();
  const { fieldValue } = useFieldValue<string>(toValue(props.modelValue));
  const { errorMessage, onInvalid, updateValidity, validityDetails, isInvalid } = useInputValidity(inputRef);

  useSyncModel({
    model: fieldValue,
    onModelPropUpdated: value => {
      fieldValue.value = value;
    },
  });

  const labelProps = createLabelProps(inputId);
  const descriptionProps = createDescriptionProps(inputId);
  const errorMessageProps = createErrorProps(inputId);

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

  const inputProps = computed<TextInputDOMProps>(() => ({
    id: inputId,
    'aria-labelledby': labelProps.id,
    name: toValue(props.name),
    value: fieldValue.value,
    type: toValue(props.type),
    required: toValue(props.required),
    readonly: toValue(props.readonly),
    disabled: toValue(props.disabled),
    maxlength: toValue(props.maxLength),
    minlength: toValue(props.minLength),
    pattern: toValue(props.pattern),
    placeholder: toValue(props.placeholder),
    'aria-describedby': errorMessage.value ? errorMessageProps.id : props.description ? descriptionProps.id : undefined,
    'aria-invalid': errorMessage.value ? true : undefined,
    ...handlers,
  }));

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
