import { ref, toValue, watch, shallowRef, computed } from 'vue';
import { ControlProps, InputEvents, Maybe, Reactivify } from '../types';
import { Orientation } from '../types';
import {
  debounce,
  hasKeyCode,
  isEqual,
  normalizeProps,
  propsToValues,
  useUniqId,
  useCaptureProps,
} from '../utils/common';
import { resolveFieldState } from '../useFormField';
import { FieldTypePrefixes } from '../constants';
import { useListBox } from '../useListBox';
import { useInputValidity } from '../validation';
import { FilterFn } from '../collections';
import { useControlButtonProps } from '../helpers/useControlButtonProps';
import { useVModelProxy } from '../reactivity/useVModelProxy';
import { useFieldControllerContext } from '../useFormField/useFieldController';
import { registerField } from '@formwerk/devtools';

export interface ComboBoxControlProps<TOption, TValue = TOption> extends ControlProps<TValue> {
  /**
   * Placeholder text when no option is selected.
   */
  placeholder?: string;

  /**
   * Whether the select field is readonly.
   */
  readonly?: boolean;

  /**
   * The orientation of the listbox popup (vertical or horizontal).
   */
  orientation?: Orientation;

  /**
   * Whether to disable HTML5 validation.
   */
  disableHtmlValidation?: Boolean;

  /**
   * Whether to open the popup when the input is focused.
   */
  openOnFocus?: boolean;

  /**
   * Function to create a new option from the user input.
   */
  onNewValue?(value: string): Maybe<{ label: string; value: TValue }>;
}

export interface ComboBoxCollectionOptions {
  /**
   * The filter function to use.
   */
  filter: FilterFn;
}

export function useComboBoxControl<TOption, TValue = TOption>(
  _props: Reactivify<ComboBoxControlProps<TOption, TValue>, 'onNewValue' | '_field' | 'schema'>,
  collectionOptions?: Partial<ComboBoxCollectionOptions>,
) {
  const props = normalizeProps(_props, ['onNewValue', '_field', 'schema']);
  const inputEl = shallowRef<HTMLElement>();
  const buttonEl = shallowRef<HTMLElement>();
  const field = resolveFieldState<TValue>(props);
  const controller = useFieldControllerContext(props);
  const inputValue = ref('');
  const inputId = useUniqId(FieldTypePrefixes.ComboBox);
  const isReadOnly = () => toValue(props.readonly);
  const isDisabled = computed(() => toValue(props.disabled) || field.isDisabled.value);
  const { model, setModelValue } = useVModelProxy(field);

  useInputValidity({ field, inputEl, disableHtmlValidation: props.disableHtmlValidation });

  controller?.registerControl({
    getControlElement: () => inputEl.value,
    getControlId: () => inputId,
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
    isEmpty,
    focusFirst: focusFirstOption,
    focusLast: focusLastOption,
  } = useListBox<TOption, TValue>({
    labeledBy: () => controller?.labelledByProps.value['aria-labelledby'],
    focusStrategy: 'FOCUS_ATTR_SELECTED',
    disabled: isDisabled,
    label: controller?.label ?? '',
    multiple: false,
    orientation: props.orientation,
    isValueSelected: value => {
      return isEqual(model.value, value);
    },
    handleToggleValue: value => {
      if (isReadOnly()) {
        return;
      }

      setModelValue(value);
      inputValue.value = selectedOption.value?.label ?? '';
      isPopupOpen.value = false;
    },
  });

  watch(selectedOption, () => {
    inputValue.value = selectedOption.value?.label ?? '';
  });

  const handlers: InputEvents & { onKeydown(evt: KeyboardEvent): void; onFocus(): void } = {
    onInput(evt) {
      inputValue.value = (evt.target as HTMLInputElement).value;
    },
    async onBlur(evt) {
      field.setTouched(true);
      if (isReadOnly()) {
        return;
      }

      // If an option was clicked, then it would blur the field and so we want to select the clicked option via the `relatedTarget` property.
      let relatedTarget = (evt as any).relatedTarget as HTMLElement | null;
      if (relatedTarget) {
        relatedTarget = relatedTarget.closest('[role="option"]') as HTMLElement | null;
        const opt = renderedOptions.value.find(opt => opt.id === relatedTarget?.id);
        if (opt) {
          setModelValue(opt.getValue());
          inputValue.value = opt.getLabel() ?? '';
          isPopupOpen.value = false;
        }

        return;
      }

      findClosestOptionAndSetValue(inputValue.value, false);
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
        if (isPopupOpen.value && !isReadOnly()) {
          evt.preventDefault();
          const option = findFocusedOption();
          if (option) {
            option.toggleSelected();
            return;
          }

          if (inputValue.value) {
            findClosestOptionAndSetValue(inputValue.value);
          }

          return;
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

      if (hasKeyCode(evt, 'End')) {
        focusLastOption();
        return;
      }

      if (hasKeyCode(evt, 'Home')) {
        focusFirstOption();
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
    onFocus() {
      if (toValue(props.openOnFocus)) {
        isPopupOpen.value = true;
      }
    },
  };

  function findClosestOptionAndSetValue(search: string, addNew = true) {
    // Try to find if the search matches an option's label.
    let item = renderedOptions.value.find(i => i?.getLabel() === search);

    // Try to find if the search matches an option's label after trimming it.
    if (!item) {
      item = renderedOptions.value.find(i => i?.getLabel() === search.trim());
    }

    if (props.onNewValue && addNew && !isReadOnly()) {
      const newOptionValue = props.onNewValue(inputValue.value);

      if (newOptionValue) {
        setModelValue(newOptionValue.value);
        inputValue.value = newOptionValue.label;

        return;
      }
    }

    // Find an option with a matching value to the last one selected.
    if (!item) {
      item = renderedOptions.value.find(i => isEqual(i?.getValue(), model.value));
    }

    if (item) {
      inputValue.value = item?.getLabel() ?? '';
      setModelValue(item?.getValue());

      return;
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

  const buttonProps = useControlButtonProps(() => ({
    id: `${inputId}-btn`,
    disabled: isDisabled.value,
    type: 'button' as const,
    'aria-haspopup': 'listbox' as const,
    'aria-expanded': isPopupOpen.value,
    'aria-activedescendant': findFocusedOption()?.id ?? undefined,
    'aria-controls': listBoxId,
    onClick: onButtonClick,
  }));

  // https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/#rps_label_textbox
  const inputProps = useCaptureProps(() => {
    return {
      id: inputId,
      type: 'text' as const,
      role: 'combobox' as const,
      'aria-haspopup': 'listbox' as const,
      'aria-controls': listBoxId,
      'aria-expanded': isPopupOpen.value ? ('true' as const) : ('false' as const),
      'aria-activedescendant': findFocusedOption()?.id ?? undefined,
      disabled: isDisabled.value ? true : undefined,
      value: inputValue.value,
      ...propsToValues(props, ['name', 'placeholder', 'required', 'readonly']),
      ...controller?.accessibleErrorProps.value,
      ...controller?.describedByProps.value,
      ...handlers,
    };
  }, inputEl);

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

  if (__DEV__) {
    registerField(field, 'ComboBox');
  }

  return {
    /**
     * The id of the input element.
     */
    controlId: inputId,

    /**
     * Props for the input element.
     */
    inputProps,
    /**
     * Reference to the input element.
     */
    inputEl,

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
    /**
     * Whether the listbox is empty, i.e. no options are visible.
     */
    isListEmpty: isEmpty,

    /**
     * The field state.
     */
    field,
  };
}
