import { computed, ref, toValue } from 'vue';
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
  createDescribedByProps,
  hasKeyCode,
  normalizeProps,
  propsToValues,
  useUniqId,
  useCaptureProps,
} from '../utils/common';
import { useInputValidity } from '../validation/useInputValidity';
import { useLabel, useErrorMessage } from '../a11y';
import { useFormField, exposeField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { registerField } from '@formwerk/devtools';

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
  /**
   * The label text for the search field.
   */
  label: string;

  /**
   * The label text for the clear button.
   */
  clearButtonLabel?: string;

  /**
   * The v-model value of the search field.
   */
  modelValue?: string;

  /**
   * The description text for the search field.
   */
  description?: string;

  /**
   * The name attribute for the search field input.
   */
  name?: string;

  /**
   * The value attribute of the search field input.
   */
  value?: string;

  /**
   * The maximum length of text allowed in the search field.
   */
  maxLength?: Numberish;

  /**
   * The minimum length of text required in the search field.
   */
  minLength?: Numberish;

  /**
   * A regular expression pattern that the search field's value must match.
   */
  pattern?: string | undefined;

  /**
   * Placeholder text shown when the search field is empty.
   */
  placeholder?: string | undefined;

  /**
   * Whether the search field is required.
   */
  required?: boolean;

  /**
   * Whether the search field is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the search field is disabled.
   */
  disabled?: boolean;

  /**
   * Schema for search field validation.
   */
  schema?: StandardSchema<string>;

  /**
   * Handler called when the search field is submitted via the Enter key.
   */
  onSubmit?: (value: string) => void;

  /**
   * Whether to disable HTML5 form validation.
   */
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  disableHtmlValidation?: Boolean;
}

export function useSearchField(_props: Reactivify<SearchFieldProps, 'onSubmit' | 'schema'>) {
  const props = normalizeProps(_props, ['onSubmit', 'schema']);
  const inputId = useUniqId(FieldTypePrefixes.SearchField);
  const inputEl = ref<HTMLInputElement>();
  const field = useFormField<string | undefined>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const isMutable = () => !toValue(props.readonly) && !field.isDisabled.value;

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

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
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

  const inputProps = useCaptureProps<SearchInputDOMProps>(() => {
    return {
      ...propsToValues(props, ['name', 'pattern', 'placeholder', 'required', 'readonly']),
      ...labelledByProps.value,
      ...describedByProps.value,
      ...accessibleErrorProps.value,
      id: inputId,
      value: fieldValue.value,
      disabled: field.isDisabled.value ? true : undefined,
      type: 'search',
      maxlength: toValue(props.maxLength),
      minlength: toValue(props.minLength),
      ...handlers,
    };
  }, inputEl);

  if (__DEV__) {
    registerField(field, 'Search');
  }

  return exposeField(
    {
      /**
       * Reference to the input element.
       */
      inputEl,
      /**
       * Props for the input element.
       */
      inputProps,
      /**
       * Props for the label element.
       */
      labelProps,
      /**
       * Props for the error message element.
       */
      errorMessageProps,
      /**
       * Props for the description element.
       */
      descriptionProps,
      /**
       * Props for the clear button.
       */
      clearBtnProps,
      /**
       * Validity details for the search field.
       */
      validityDetails,
    },
    field,
  );
}
