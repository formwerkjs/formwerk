import { Reactivify, RovingTabIndex } from '../types';
import { computed, CSSProperties, inject, nextTick, ref, shallowRef, toValue, watch } from 'vue';
import { hasKeyCode, normalizeProps, useUniqId, warn, useCaptureProps } from '../utils/common';
import { ListManagerKey, OptionElement } from '../useListBox';
import { FieldTypePrefixes } from '../constants';
import { createDisabledContext } from '../helpers/createDisabledContext';

interface OptionDomProps {
  id: string;
  role: 'option';
  tabindex: RovingTabIndex;
  hidden?: boolean;
  style?: CSSProperties;
  // Used when the listbox allows single selection
  'aria-selected'?: boolean;
  // Used when the listbox allows multiple selections
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
}

export interface OptionProps<TValue> {
  /**
   * The label text for the option.
   */
  label: string;

  /**
   * The value associated with this option.
   */
  value: TValue;

  /**
   * Whether the option is disabled.
   */
  disabled?: boolean;
}

export function useOption<TOption>(_props: Reactivify<OptionProps<TOption>>) {
  const props = normalizeProps(_props);
  const optionEl = ref<OptionElement>();
  const isFocused = shallowRef(false);
  const isDisabled = createDisabledContext(props.disabled);
  // Used to hide the option when a filter is applied and doesn't match the item.
  const isHidden = shallowRef(false);
  const listManager = inject(ListManagerKey, null);

  if (!listManager) {
    warn(
      'An option component must exist within a ListBox Context. Did you forget to call `useSelect` / `useListBox` / `useComboBox` in a parent component?',
    );
  }

  function getValue() {
    return toValue(props.value);
  }

  const isSelected = computed(() => listManager?.isValueSelected(getValue()) ?? false);
  const optionId = useUniqId(FieldTypePrefixes.Option);

  function unfocus() {
    isFocused.value = false;
  }

  const reg = listManager?.useOptionRegistration({
    id: optionId,
    toggleSelected,
    isDisabled: () => isDisabled.value,
    isSelected: () => isSelected.value,
    isFocused: () => isFocused.value,
    getLabel: () => toValue(props.label) ?? '',
    getValue,
    isHidden: () => isHidden.value,
    setHidden: value => {
      isHidden.value = value;
      if (value) {
        unfocus();
      }
    },
    unfocus,
    focus: () => {
      isFocused.value = true;
      nextTick(() => {
        if (listManager?.getFocusStrategy() === 'FOCUS_DOM') {
          optionEl.value?.focus();
          return;
        }

        if (!listManager?.isInViewport(optionEl.value)) {
          optionEl.value?.scrollIntoView();
        }
      });
    },
  });

  function toggleSelected() {
    listManager?.toggleValue(getValue());
  }

  const handlers = {
    onClick() {
      if (isDisabled.value) {
        return;
      }

      listManager?.toggleValue(getValue());
    },
    onKeydown(e: KeyboardEvent) {
      if (isDisabled.value) {
        return;
      }

      if (hasKeyCode(e, 'Space') || hasKeyCode(e, 'Enter')) {
        e.preventDefault();
        e.stopPropagation();
        toggleSelected();
      }
    },
    onBlur() {
      isFocused.value = false;
    },
  };

  const optionProps = useCaptureProps<OptionDomProps>(() => {
    const isMultiple = listManager?.isMultiple() ?? false;
    const focusStrategy = listManager?.getFocusStrategy();
    const isVirtuallyFocused = focusStrategy === 'FOCUS_ATTR_SELECTED' && isFocused.value && listManager?.isPopupOpen();
    const focusAttr = focusStrategy === 'FOCUS_ATTR_SELECTED' ? 'aria-selected' : undefined;
    let selectedAttr = isMultiple ? ('aria-checked' as const) : ('aria-selected' as const);

    const domProps: OptionDomProps = {
      id: optionId,
      role: 'option',
      tabindex: isFocused.value && focusStrategy === 'FOCUS_DOM' ? '0' : '-1',
      'aria-disabled': isDisabled.value || undefined,
      ...handlers,
    };

    if (focusAttr) {
      domProps[focusAttr] = isVirtuallyFocused || undefined;
      selectedAttr = 'aria-checked';
    }

    if (isHidden.value) {
      domProps.hidden = true;
      domProps['aria-hidden'] = true;
      domProps.style = {
        display: 'none',
      };
    }

    domProps[selectedAttr] = isSelected.value;

    return domProps;
  }, optionEl);

  watch(optionEl, () => {
    if (optionEl.value) {
      optionEl.value._fwOption = reg;
    }
  });

  return {
    /**
     * Props for the option element.
     */
    optionProps,
    /**
     * Whether the option is selected.
     */
    isSelected,
    /**
     * Reference to the option element.
     */
    optionEl,
    /**
     * Whether the option is disabled.
     */
    isDisabled,
  };
}
