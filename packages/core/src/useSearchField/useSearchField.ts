import { Ref, computed, ref, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  InputEvents,
  Numberish,
  Reactivify,
  TextInputBaseAttributes,
  TypedSchema,
} from '../types';
import {
  createAccessibleErrorMessageProps,
  createDescribedByProps,
  normalizeProps,
  propsToValues,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useErrorDisplay } from '../useFormField/useErrorDisplay';

export interface SearchInputDOMAttributes extends TextInputBaseAttributes {
  type?: 'search';
}

export interface SearchInputDOMProps
  extends SearchInputDOMAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    AriaValidatableProps,
    InputEvents {
  id: string;
}

export interface SearchFieldProps {
  label: string;
  modelValue?: string;
  description?: string;
  // TODO: Vue cannot resolve these types if they are mapped from up there
  name?: string;
  value?: string;
  maxLength?: Numberish;
  minLength?: Numberish;
  pattern?: string | undefined;
  placeholder?: string | undefined;

  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;

  schema?: TypedSchema<string>;

  onSubmit?: (value: string) => void;
}

export function useSearchField(
  _props: Reactivify<SearchFieldProps, 'onSubmit' | 'schema'>,
  elementRef?: Ref<HTMLInputElement>,
) {
  const props = normalizeProps(_props, ['onSubmit', 'schema']);
  const inputId = useUniqId(FieldTypePrefixes.SearchField);
  const inputRef = elementRef || ref<HTMLInputElement>();
  const field = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { validityDetails, updateValidity } = useInputValidity({ inputRef, field });
  const { displayError } = useErrorDisplay(field);
  const { fieldValue, setValue, isTouched, setTouched, errorMessage, isValid, errors } = field;

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

  const clearBtnProps = {
    tabindex: '-1',
    type: 'button' as const,
    ariaLabel: 'Clear search',
    onClick() {
      setValue('');
      updateValidity();
    },
  };

  const handlers: InputEvents = {
    onInput: (event: Event) => {
      setValue((event.target as HTMLInputElement).value);
    },
    onChange: (event: Event) => {
      setValue((event.target as HTMLInputElement).value);
    },
    onBlur() {
      setTouched(true);
    },
    onKeydown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        e.preventDefault();
        setValue('');
        setTouched(true);
        updateValidity();
        return;
      }

      if (e.code === 'Enter' && !inputRef.value?.form && props.onSubmit) {
        e.preventDefault();
        setTouched(true);
        if (isValid.value) {
          props.onSubmit(fieldValue.value || '');
        }
      }
    },
  };

  const inputProps = computed<SearchInputDOMProps>(() =>
    withRefCapture(
      {
        ...propsToValues(props, ['name', 'pattern', 'placeholder', 'required', 'readonly', 'disabled']),
        ...labelledByProps.value,
        ...describedByProps.value,
        ...accessibleErrorProps.value,
        id: inputId,
        value: fieldValue.value,
        type: 'search',
        maxlength: toValue(props.maxLength),
        minlength: toValue(props.minLength),
        ...handlers,
      },
      inputRef,
      elementRef,
    ),
  );

  return {
    inputRef,
    inputProps,
    labelProps,
    fieldValue,
    errorMessage,
    errorMessageProps,
    descriptionProps,
    clearBtnProps,
    validityDetails,
    isValid,
    isTouched,
    errors,

    setErrors: field.setErrors,
    setValue: field.setValue,
    setTouched: field.setTouched,
    displayError,
  };
}
