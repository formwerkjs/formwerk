import { Ref, computed, ref, toValue } from 'vue';
import {
  AriaDescribableProps,
  AriaLabelableProps,
  AriaValidatableProps,
  InputEvents,
  Numberish,
  Reactivify,
  TextInputBaseAttributes,
  StandardSchema,
} from '../types';
import {
  createAccessibleErrorMessageProps,
  createDescribedByProps,
  hasKeyCode,
  normalizeProps,
  propsToValues,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel } from '../a11y/useLabel';
import { useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { exposeField } from '../utils/exposers';

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
  clearButtonLabel?: string;
  modelValue?: string;
  description?: string;

  name?: string;
  value?: string;
  maxLength?: Numberish;
  minLength?: Numberish;
  pattern?: string | undefined;
  placeholder?: string | undefined;

  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;

  schema?: StandardSchema<string>;

  onSubmit?: (value: string) => void;

  disableHtmlValidation?: boolean;
}

export function useSearchField(
  _props: Reactivify<SearchFieldProps, 'onSubmit' | 'schema'>,
  elementRef?: Ref<HTMLInputElement>,
) {
  const props = normalizeProps(_props, ['onSubmit', 'schema']);
  const inputId = useUniqId(FieldTypePrefixes.SearchField);
  const inputEl = elementRef || ref<HTMLInputElement>();
  const field = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const isMutable = () => !toValue(props.readonly) && !toValue(props.disabled);

  const { validityDetails, updateValidity } = useInputValidity({
    inputEl,
    field,
    disableHtmlValidation: props.disableHtmlValidation,
  });
  const { fieldValue, setValue, setTouched, errorMessage, isValid } = field;

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

  const clearBtnProps = computed(() => {
    return {
      tabindex: '-1',
      type: 'button' as const,
      ariaLabel: toValue(props.clearButtonLabel) ?? 'Clear search',
      onClick() {
        if (!isMutable()) {
          return;
        }

        setValue('');
        updateValidity();
      },
    };
  });

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
      if (hasKeyCode(e, 'Escape')) {
        e.preventDefault();
        if (!isMutable()) {
          return;
        }

        setValue('');
        setTouched(true);
        updateValidity();
        return;
      }

      if (hasKeyCode(e, 'Enter') && !inputEl.value?.form && props.onSubmit) {
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
      inputEl,
      elementRef,
    ),
  );

  return {
    inputEl,
    inputProps,
    labelProps,
    errorMessageProps,
    descriptionProps,
    clearBtnProps,
    validityDetails,
    ...exposeField(field),
  };
}
