import { computed, ref, toValue, watch } from 'vue';
import { InputEvents, Reactivify, StandardSchema } from '../types';
import { Orientation } from '../types';
import {
  createDescribedByProps,
  debounce,
  hasKeyCode,
  isEqual,
  normalizeProps,
  propsToValues,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import { exposeField, useFormField } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useLabel } from '../a11y/useLabel';
import { useListBox } from '../useListBox';
import { useErrorMessage } from '../a11y/useErrorMessage';
import { useInputValidity } from '../validation';
import { FilterFn } from '../collections';

export interface ComboBoxProps<TOption, TValue = TOption> {
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
  value?: TValue;

  /**
   * Whether the select field is required.
   */
  required?: boolean;

  /**
   * The v-model value of the select field.
   */
  modelValue?: TValue;

  /**
   * Whether the select field is disabled.
   */
  disabled?: boolean;

  /**
   * Whether the select field is readonly.
   */
  readonly?: boolean;

  /**
   * The orientation of the listbox popup (vertical or horizontal).
   */
  orientation?: Orientation;

  /**
   * Schema for validating the select field value.
   */
  schema?: StandardSchema<TValue>;

  /**
   * Whether to disable HTML5 validation.
   */
  disableHtmlValidation?: boolean;

  /**
   * Whether to allow custom values, false by default. When the user blurs the input the value is reset to the selected option or blank if no option is selected.
   */
  allowCustomValue?: boolean;

  /**
   * Whether multiple options can be selected.
   */
  onNewValue?(value: TValue): TOption | Promise<TOption>;
}

export interface ComboBoxCollectionOptions {
  /**
   * The filter function to use.
   */
  filter: FilterFn;
}

export function useComboBox<TOption, TValue = TOption>(
  _props: Reactivify<ComboBoxProps<TOption, TValue>, 'schema' | 'onNewValue'>,
  collectionOptions?: Partial<ComboBoxCollectionOptions>,
) {
  const props = normalizeProps(_props, ['schema']);
  const inputEl = ref<HTMLElement>();
  const buttonEl = ref<HTMLElement>();
  const inputValue = ref('');
  const inputId = useUniqId(FieldTypePrefixes.ComboBox);
  const field = useFormField<TValue>({
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as TValue,
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

  const {
    listBoxId,
    listBoxProps,
    isPopupOpen,
    listBoxEl,
    selectedOption,
    focusNext,
    focusPrev,
    findFocusedOption,
    renderedOptions,
  } = useListBox<TOption, TValue>({
    labeledBy: () => labelledByProps.value['aria-labelledby'],
    focusStrategy: 'FOCUS_ATTR_SELECTED',
    disabled: isDisabled,
    label: props.label,
    multiple: false,
    orientation: props.orientation,
    isValueSelected: value => {
      return isEqual(fieldValue.value, value);
    },
    handleToggleValue: value => {
      setValue(value);
      inputValue.value = selectedOption.value?.label ?? '';
      isPopupOpen.value = false;
    },
  });

  const handlers: InputEvents & { onKeydown(evt: KeyboardEvent): void } = {
    onInput(evt) {
      inputValue.value = (evt.target as HTMLInputElement).value;
    },
    onChange(evt) {
      inputValue.value = (evt.target as HTMLInputElement).value;
    },
    async onBlur(evt) {
      setTouched(true);
      // If an option was clicked, then it would blur the field and so we want to select the clicked option via the `relatedTarget` property.
      let relatedTarget = (evt as any).relatedTarget as HTMLElement | null;
      if (relatedTarget) {
        relatedTarget = relatedTarget.closest('[role="option"]') as HTMLElement | null;
        const opt = renderedOptions.value.find(opt => opt.id === relatedTarget?.id);
        if (opt) {
          setValue(opt.getValue());
          inputValue.value = opt.getLabel() ?? '';
          isPopupOpen.value = false;
        }

        return;
      }

      findClosestOptionAndSetValue(inputValue.value);
    },
    onKeydown(evt: KeyboardEvent) {
      if (isDisabled.value) {
        return;
      }

      // Clear the input value when Escape is pressed if the popup is not open.
      if (hasKeyCode(evt, 'Escape')) {
        evt.preventDefault();
        if (!isPopupOpen.value) {
          inputValue.value = '';
        } else {
          isPopupOpen.value = false;
        }

        return;
      }

      if (hasKeyCode(evt, 'Enter')) {
        if (isPopupOpen.value) {
          findFocusedOption()?.toggleSelected();
        }

        return;
      }

      // Open the popup when vertical arrow keys are pressed and the popup is not open.
      if (['ArrowDown', 'ArrowUp'].includes(evt.code)) {
        evt.preventDefault();

        if (!isPopupOpen.value) {
          isPopupOpen.value = true;
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        hasKeyCode(evt, 'ArrowDown') ? focusNext() : focusPrev();

        return;
      }

      if (hasKeyCode(evt, 'Tab')) {
        isPopupOpen.value = false;
        findClosestOptionAndSetValue(inputValue.value);

        return;
      }

      if (!isPopupOpen.value) {
        isPopupOpen.value = true;
      }
    },
  };

  function findClosestOptionAndSetValue(search: string) {
    if (!renderedOptions.value) {
      inputValue.value = selectedOption.value?.label ?? '';
      return;
    }

    // Try to find if the search matches an option's label.
    let item = renderedOptions.value.find(i => i?.getLabel() === search);

    // Try to find if the search matches an option's label after trimming it.
    if (!item) {
      item = renderedOptions.value.find(i => i?.getLabel() === search.trim());
    }

    // Find an option with a matching value to the last one selected.
    if (!item) {
      item = renderedOptions.value.find(i => isEqual(i?.getValue(), fieldValue.value));
    }

    if (item) {
      inputValue.value = item?.getLabel() ?? '';
      setValue(item?.getValue());
    }
  }

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
        type: 'button' as const,
        'aria-haspopup': 'listbox' as const,
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
        'aria-haspopup': 'listbox' as const,
        'aria-controls': listBoxId,
        'aria-expanded': isPopupOpen.value ? ('true' as const) : ('false' as const),
        'aria-activedescendant': selectedOption.value?.id,
        disabled: isDisabled.value ? true : undefined,
        value: inputValue.value,
        ...propsToValues(props, ['name', 'placeholder', 'required', 'readonly']),
        ...accessibleErrorProps.value,
        ...describedByProps.value,
        ...handlers,
      },
      inputEl,
    );
  });

  const filter = collectionOptions?.filter;
  if (filter) {
    function updateHiddenState(textValue: string) {
      if (!filter) {
        return;
      }

      renderedOptions.value.forEach(opt => {
        opt.setHidden(
          !filter({
            option: { value: opt.getValue(), label: opt.getLabel() },
            search: textValue,
          }),
        );
      });
    }

    watch(inputValue, debounce(filter.debounceMs, updateHiddenState));
  }

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
       * Props for the listbox/popup element.
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
      /**
       * The value of the text field, will contain the label of the selected option or the user input if they are currently typing.
       */
      inputValue,
      /**
       * The selected option.
       */
      selectedOption,
    },
    field,
  );
}
