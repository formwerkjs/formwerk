import { computed, ref, toValue } from 'vue';
import { useFormField, exposeField } from '../useFormField';
import { AriaLabelableProps, Arrayable, Orientation, Reactivify, StandardSchema } from '../types';
import {
  createDescribedByProps,
  isEqual,
  normalizeArrayable,
  normalizeProps,
  toggleValueSelection,
  useUniqId,
  withRefCapture,
} from '../utils/common';
import { useInputValidity } from '../validation';
import { useListBox } from '../useListBox';
import { useLabel, useErrorMessage } from '../a11y';
import { FieldTypePrefixes } from '../constants';
import { registerField } from '@formwerk/devtools';

export interface SelectProps<TOption, TValue = TOption> {
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
  value?: Arrayable<TValue>;

  /**
   * The v-model value of the select field.
   */
  modelValue?: Arrayable<TValue>;

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
  schema?: StandardSchema<Arrayable<TValue>>;
}

export interface SelectTriggerDomProps extends AriaLabelableProps {
  id: string;
  role: 'combobox';
  'aria-haspopup': 'listbox';
  'aria-disabled'?: boolean;
  'aria-expanded': boolean;
  'aria-activedescendant'?: string;
}

const MENU_OPEN_KEYS = ['Enter', 'Space', 'ArrowDown', 'ArrowUp'];

export function useSelect<TOption, TValue = TOption>(_props: Reactivify<SelectProps<TOption, TValue>, 'schema'>) {
  const inputId = useUniqId(FieldTypePrefixes.Select);
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<Arrayable<TValue>>({
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as Arrayable<TValue>,
    disabled: props.disabled,
    schema: props.schema,
  });

  const { fieldValue, setValue, errorMessage, isDisabled } = field;
  const isMutable = () => !isDisabled.value && !toValue(props.readonly);
  const { labelProps, labelledByProps } = useLabel({
    label: props.label,
    for: inputId,
  });

  let lastRecentlySelectedOption: TValue | undefined;
  const {
    listBoxProps,
    isPopupOpen,
    renderedOptions,
    isShiftPressed,
    listBoxEl,
    selectedOption,
    selectedOptions,
    listBoxId,
    findFocusedOption,
  } = useListBox<TOption, TValue>({
    labeledBy: () => labelledByProps.value['aria-labelledby'],
    disabled: isDisabled,
    autofocusOnOpen: true,
    isValueSelected,
    handleToggleValue: toggleValue,
    label: props.label,
    multiple: props.multiple,
    orientation: props.orientation,
    onToggleAll: toggleAll,
    onToggleBefore: toggleBefore,
    onToggleAfter: toggleAfter,
  });

  const { updateValidity } = useInputValidity({ field });
  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId,
    description: props.description,
  });
  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId,
    errorMessage,
  });

  function isSingle() {
    const isMultiple = toValue(props.multiple);

    return !isMultiple;
  }

  function isValueSelected(value: TValue): boolean {
    const values = normalizeArrayable(fieldValue.value ?? []);

    return values.some(item => isEqual(item, value));
  }

  function toggleValue(optionValue: TValue, force?: boolean) {
    if (!isMutable()) {
      return;
    }

    if (isSingle()) {
      lastRecentlySelectedOption = optionValue;
      setValue(optionValue);
      updateValidity();
      isPopupOpen.value = false;
      return;
    }

    if (!isShiftPressed.value) {
      lastRecentlySelectedOption = optionValue;
      const nextValue = toggleValueSelection<TValue>(fieldValue.value ?? [], optionValue, force);
      setValue(nextValue);
      updateValidity();
      return;
    }

    // Handles contiguous selection when shift key is pressed, aka select all options between the two ranges.
    let lastRecentIdx = renderedOptions.value.findIndex(opt => isEqual(opt.getValue(), lastRecentlySelectedOption));
    const targetIdx = renderedOptions.value.findIndex(opt => isEqual(opt.getValue(), optionValue));
    if (targetIdx === -1) {
      return;
    }

    lastRecentIdx = lastRecentIdx === -1 ? 0 : lastRecentIdx;
    const startIdx = Math.min(lastRecentIdx, targetIdx);
    const endIdx = Math.min(Math.max(lastRecentIdx, targetIdx), renderedOptions.value.length - 1);
    selectRange(startIdx, endIdx);
  }

  function selectRange(start: number, end: number) {
    const nextValue = renderedOptions.value.slice(start, end + 1).map(opt => opt.getValue());
    setValue(nextValue);
    updateValidity();
  }

  function toggleBefore() {
    if (isSingle() || !isMutable()) {
      return;
    }

    const focusedIdx = renderedOptions.value.findIndex(opt => opt.isFocused());
    if (focusedIdx < 0) {
      return;
    }

    const startIdx = 0;
    const endIdx = Math.min(focusedIdx, renderedOptions.value.length - 1);
    selectRange(startIdx, endIdx);
  }

  function toggleAfter() {
    if (isSingle() || !isMutable()) {
      return;
    }

    const focusedIdx = renderedOptions.value.findIndex(opt => opt.isFocused());
    const startIdx = Math.max(0, focusedIdx);
    const endIdx = renderedOptions.value.length - 1;
    selectRange(startIdx, endIdx);
  }

  function toggleAll() {
    if (isSingle() || !isMutable()) {
      return;
    }

    const isAllSelected = renderedOptions.value.every(opt => opt.isSelected());
    if (isAllSelected) {
      setValue([]);
      updateValidity();
      return;
    }

    setValue(renderedOptions.value.map(opt => opt.getValue()));
    updateValidity();
  }

  const handlers = {
    onClick() {
      if (isDisabled.value) {
        return;
      }

      isPopupOpen.value = !isPopupOpen.value;
    },
    onKeydown(e: KeyboardEvent) {
      if (isDisabled.value) {
        return;
      }

      if (!isPopupOpen.value && MENU_OPEN_KEYS.includes(e.code)) {
        e.preventDefault();
        isPopupOpen.value = true;
        return;
      }
    },
  };

  const triggerEl = ref<HTMLElement>();

  const triggerProps = computed<SelectTriggerDomProps>(() => {
    return withRefCapture(
      {
        ...labelledByProps.value,
        ...describedByProps.value,
        ...accessibleErrorProps.value,
        id: inputId,
        tabindex: isDisabled.value ? '-1' : '0',
        type: triggerEl.value?.tagName === 'BUTTON' ? 'button' : undefined,
        role: 'combobox' as const,
        'aria-haspopup': 'listbox',
        'aria-expanded': isPopupOpen.value,
        'aria-disabled': isDisabled.value || undefined,
        'aria-activedescendant': findFocusedOption()?.id ?? undefined,
        'aria-controls': listBoxId,
        ...handlers,
      },
      triggerEl,
    );
  });

  if (__DEV__) {
    registerField(field, 'Select');
  }

  return exposeField(
    {
      /**
       * Whether the popup is open.
       */
      isPopupOpen,
      /**
       * Props for the trigger element.
       */
      triggerProps,
      /**
       * Props for the label element.
       */
      labelProps,
      /**
       * Props for the listbox/popup element.
       */
      listBoxProps,
      /**
       * Props for the error message element.
       */
      errorMessageProps,
      /**
       * Props for the description element.
       */
      descriptionProps,
      /**
       * Reference to the popup element.
       */
      listBoxEl,
      /**
       * The currently selected option.
       */
      selectedOption,
      /**
       * The currently selected options.
       */
      selectedOptions,
    },
    field,
  );
}
