import { toValue, shallowRef, computed } from 'vue';
import { FormField, useFormFieldContext } from '../useFormField';
import { AriaLabelableProps, Arrayable, Orientation, Reactivify } from '../types';
import {
  isEqual,
  normalizeArrayable,
  normalizeProps,
  toggleValueSelection,
  useUniqId,
  useCaptureProps,
} from '../utils/common';
import { useInputValidity } from '../validation';
import { useListBox } from '../useListBox';
import { FieldTypePrefixes } from '../constants';
import { useConstraintsValidator } from '../validation/useConstraintsValidator';
import { useVModelProxy } from '../reactivity/useVModelProxy';

export interface SelectControlProps<TValue> {
  /**
   * The name of the select field.
   */
  name?: string;

  /**
   * Whether the select field is required.
   */
  required?: boolean;

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

interface SelectControlExtras<TOption, TValue = TOption> {
  field?: FormField<Arrayable<TValue>>;
}

export function useSelectControl<TOption, TValue = TOption>(
  _props: Reactivify<SelectControlProps<TValue>>,
  ctx?: SelectControlExtras<TOption, TValue>,
) {
  const inputId = useUniqId(FieldTypePrefixes.Select);
  const props = normalizeProps(_props);
  const field = ctx?.field ?? useFormFieldContext<Arrayable<TValue>>();
  const triggerEl = shallowRef<HTMLElement>();
  const { model, setModelValue } = useVModelProxy(field);

  const isDisabled = computed(() => toValue(props.disabled) || field?.isDisabled.value);
  const isMutable = () => !isDisabled.value && !toValue(props.readonly);

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
    labeledBy: () => field?.labelledByProps.value['aria-labelledby'],
    autofocusOnOpen: true,
    label: field?.label ?? '',
    disabled: isDisabled,
    isValueSelected,
    handleToggleValue: toggleValue,
    multiple: props.multiple,
    orientation: props.orientation,
    onToggleAll: toggleAll,
    onToggleBefore: toggleBefore,
    onToggleAfter: toggleAfter,
  });

  const { element: inputEl } = useConstraintsValidator({
    type: 'select',
    required: props.required,
    value: model as unknown as string,
    source: triggerEl,
  });

  if (field) {
    useInputValidity({ field, inputEl });
    field.registerControl({
      getControlElement: () => triggerEl.value,
      getControlId: () => inputId,
    });
  }

  function isSingle() {
    const isMultiple = toValue(props.multiple);

    return !isMultiple;
  }

  function isValueSelected(value: TValue): boolean {
    const values = normalizeArrayable(model.value ?? []);

    return values.some(item => isEqual(item, value));
  }

  function toggleValue(optionValue: TValue, force?: boolean) {
    if (!isMutable()) {
      return;
    }

    if (isSingle()) {
      lastRecentlySelectedOption = optionValue;
      setModelValue(optionValue);
      field?.validate();
      isPopupOpen.value = false;
      return;
    }

    if (!isShiftPressed.value) {
      lastRecentlySelectedOption = optionValue;
      const nextValue = toggleValueSelection<TValue>(model.value ?? [], optionValue, force);
      setModelValue(nextValue);
      field?.validate();
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
    setModelValue(nextValue);
    field?.validate();
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
      setModelValue([]);
      field?.validate();
      return;
    }

    setModelValue(renderedOptions.value.map(opt => opt.getValue()));
    field?.validate();
  }

  const handlers = {
    onClick() {
      if (!isMutable()) {
        return;
      }

      isPopupOpen.value = !isPopupOpen.value;
    },
    onKeydown(e: KeyboardEvent) {
      if (!isMutable()) {
        return;
      }

      if (!isPopupOpen.value && MENU_OPEN_KEYS.includes(e.code)) {
        e.preventDefault();
        isPopupOpen.value = true;
        return;
      }
    },
  };

  const triggerProps = useCaptureProps<SelectTriggerDomProps>(() => {
    return {
      ...field?.labelledByProps.value,
      ...field?.describedByProps.value,
      ...field?.accessibleErrorProps.value,
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
    };
  }, triggerEl);

  return {
    /**
     * The model value of the select field.
     */
    model,

    /**
     * Whether the popup is open.
     */
    isPopupOpen,
    /**
     * Props for the trigger element.
     */
    triggerProps,

    /**
     * Props for the listbox/popup element.
     */
    listBoxProps,

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
  };
}
