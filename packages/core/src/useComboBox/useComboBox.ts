import { computed, ref, toValue } from 'vue';
import { InputEvents, Reactivify, StandardSchema } from '../types';
import { Orientation } from '../types';
import { createDescribedByProps, normalizeProps, propsToValues, useUniqId, withRefCapture } from '../utils/common';
import { exposeField, useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useLabel } from '../a11y/useLabel';
import { useListBox } from '../useListBox';
import { useErrorMessage } from '../a11y/useErrorMessage';
import { useInputValidity } from '../validation';

export interface ComboBoxProps {
  /**
   * The label text for the select field.
   */
  label: string;

  /**
   * The name of the select field.
   */
  name?: string;

  /**
   * Description text for the select field.
   */
  description?: string;

  /**
   * Placeholder text when no option is selected.
   */
  placeholder?: string;

  /**
   * The controlled value of the select field.
   */
  value?: string;

  /**
   * Whether the select field is required.
   */
  required?: boolean;

  /**
   * The v-model value of the select field.
   */
  modelValue?: string;

  /**
   * Whether the select field is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the select field is readonly.
   */
  readonly?: boolean;

  /**
   * Whether multiple options can be selected.
   */
  multiple?: boolean;

  /**
   * The orientation of the listbox popup (vertical or horizontal).
   */
  orientation?: Orientation;

  /**
   * Schema for validating the select field value.
   */
  schema?: StandardSchema<string>;

  /**
   * Whether to disable HTML5 validation.
   */
  disableHtmlValidation?: boolean;

  /**
   * A function that filters the options based on the input value.
   */
  filter?: (inputValue: string, label: string) => boolean | Promise<boolean>;
}

export function useComboBox(_props: Reactivify<ComboBoxProps, 'schema' | 'filter'>) {
  const props = normalizeProps(_props, ['schema', 'filter']);
  const inputEl = ref<HTMLElement>();
  const buttonEl = ref<HTMLElement>();
  const inputId = useUniqId(FieldTypePrefixes.ComboBox);
  const field = useFormField<string>({
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.value),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { fieldValue, setValue, errorMessage, isDisabled, setTouched } = field;
  const { labelProps, labelledByProps } = useLabel({
    label: props.label,
    for: inputId,
  });

  const { validityDetails } = useInputValidity({ field, inputEl, disableHtmlValidation: props.disableHtmlValidation });
  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId,
    errorMessage,
  });

  const { listBoxId, listBoxProps, isPopupOpen, listBoxEl, selectedOption } = useListBox<string>({
    labeledBy: () => labelledByProps.value['aria-labelledby'],
    disabled: isDisabled,
    label: props.label,
    multiple: false,
    orientation: props.orientation,
  });

  const handlers: InputEvents & { onKeyDown(evt: KeyboardEvent): void } = {
    onInput(evt) {
      setValue((evt.target as HTMLInputElement).value);
    },
    onChange(evt) {
      setValue((evt.target as HTMLInputElement).value);
    },
    onBlur() {
      setTouched(true);
    },
    onKeyDown(evt: KeyboardEvent) {
      if (isDisabled.value) {
        return;
      }

      // Close the popup when either Enter or Escape is pressed if it is open.
      if (['Enter', 'Escape'].includes(evt.code) && isPopupOpen.value) {
        evt.preventDefault();
        isPopupOpen.value = false;

        return;
      }

      // Open the popup when vertical arrow keys are pressed and the popup is not open.
      if (['ArrowDown', 'ArrowUp'].includes(evt.code) && !isPopupOpen.value) {
        evt.preventDefault();
        isPopupOpen.value = true;

        return;
      }

      // Clear the input value when Escape is pressed if the popup is not open.
      if (evt.code === 'Escape' && !isPopupOpen.value) {
        evt.preventDefault();
        setValue('');
        return;
      }
    },
  };

  /**
   * Handles the click event on the button element.
   */
  function onButtonClick() {
    if (isDisabled.value) {
      return;
    }

    isPopupOpen.value = !isPopupOpen.value;
  }

  const buttonProps = computed(() => {
    const isButton = buttonEl.value?.tagName === 'BUTTON';

    return withRefCapture(
      {
        id: inputId,
        role: isButton ? undefined : 'button',
        [isButton ? 'disabled' : 'aria-disabled']: isDisabled.value || undefined,
        tabindex: '-1',
        'aria-haspopup': 'listbox',
        'aria-expanded': isPopupOpen.value,
        'aria-activedescendant': selectedOption.value?.id,
        'aria-controls': listBoxId,
        onClick: onButtonClick,
      },
      buttonEl,
    );
  });

  // https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/#rps_label_textbox
  const inputProps = computed(() => {
    return withRefCapture(
      {
        id: inputId,
        type: 'text' as const,
        role: 'combobox' as const,
        'aria-controls': listBoxId,
        'aria-expanded': isPopupOpen.value ? ('true' as const) : ('false' as const),
        'aria-activedescendant': selectedOption.value?.id,
        disabled: isDisabled.value ? true : undefined,
        value: fieldValue.value,
        ...propsToValues(props, ['name', 'placeholder', 'required', 'readonly']),
        ...accessibleErrorProps.value,
        ...describedByProps.value,
        ...handlers,
      },
      inputEl,
    );
  });

  return exposeField(
    {
      /**
       * Props for the label element.
       */
      labelProps,
      /**
       * Props for the input element.
       */
      inputProps,
      /**
       * Reference to the input element.
       */
      inputEl,
      /**
       * Props for the error message element.
       */
      errorMessageProps,
      /**
       * Props for the listbox element.
       */
      listBoxProps,
      /**
       * Whether the popup is open.
       */
      isPopupOpen,
      /**
       * Reference to the listbox element.
       */
      listBoxEl,
      /**
       * Props for the description element.
       */
      descriptionProps,
      /**
       * Validity details for the input element.
       */
      validityDetails,
      /**
       * Reference to the button element that opens the popup.
       */
      buttonEl,
      /**
       * Props for the button element that toggles the popup.
       */
      buttonProps,
    },
    field,
  );
}
