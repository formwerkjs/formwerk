import { computed, InjectionKey, nextTick, onBeforeUnmount, provide, ref, Ref, toValue, watch } from 'vue';
import { AriaLabelableProps, Maybe, Orientation, Reactivify } from '../types';
import { hasKeyCode, normalizeProps, removeFirst, useUniqId, withRefCapture } from '../utils/common';
import { useKeyPressed } from '../helpers/useKeyPressed';
import { isMac } from '../utils/platform';
import { usePopoverController } from '../helpers/usePopoverController';
import { FieldTypePrefixes } from '../constants';
import { useBasicOptionFinder } from './basicOptionFinder';

export type FocusStrategy = 'FOCUS_DOM' | 'FOCUS_ATTR_SELECTED';

export interface ListBoxProps<TOption, TValue = TOption> {
  label: string;
  isValueSelected(value: TValue): boolean;
  handleToggleValue(value: TValue): void;

  focusStrategy?: FocusStrategy;
  labeledBy?: string;
  multiple?: boolean;
  orientation?: Orientation;
  disabled?: boolean;
  autofocusOnOpen?: boolean;

  onToggleAll?(): void;
  onToggleBefore?(): void;
  onToggleAfter?(): void;
}

export interface ListBoxDomProps extends AriaLabelableProps {
  role: 'listbox';
  'aria-multiselectable'?: boolean;
}

export interface OptionRegistration<TValue> {
  id: string;
  getLabel(): string;
  isFocused(): boolean;
  isSelected(): boolean;
  isDisabled(): boolean;
  getValue(): TValue;
  focus(): void;
  unfocus(): void;
  toggleSelected(): void;
  setHidden(value: boolean): void;
  isHidden(): boolean;
}

export interface OptionRegistrationWithId<TValue> extends OptionRegistration<TValue> {
  id: string;
}

export interface ListManagerCtx<TValue = unknown> {
  useOptionRegistration(init: OptionRegistration<TValue>): OptionRegistration<TValue>;
  isValueSelected(value: TValue): boolean;
  isMultiple(): boolean;
  toggleValue(value: TValue, force?: boolean): void;
  getFocusStrategy(): FocusStrategy;
  isPopupOpen(): boolean;
}

export interface OptionElement<TValue = unknown> extends HTMLElement {
  _fwOption?: OptionRegistration<TValue>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ListManagerKey: InjectionKey<ListManagerCtx<any>> = Symbol('ListManagerKey');

export function useListBox<TOption, TValue = TOption>(
  _props: Reactivify<ListBoxProps<TOption, TValue>, 'isValueSelected' | 'handleToggleValue'>,
  elementRef?: Ref<Maybe<HTMLElement>>,
) {
  const props = normalizeProps(_props, ['isValueSelected', 'handleToggleValue']);
  const listBoxId = useUniqId(FieldTypePrefixes.ListBox);
  const listBoxEl = elementRef || ref<HTMLElement>();
  const renderedOptions = ref<OptionRegistrationWithId<TValue>[]>([]);
  const finder = useBasicOptionFinder(renderedOptions);

  // Initialize popover controller, NO-OP if the element is not a popover-enabled element.
  const { isOpen } = usePopoverController(listBoxEl, { disabled: props.disabled });
  const isShiftPressed = useKeyPressed(['ShiftLeft', 'ShiftRight'], () => !isOpen.value);
  const isMetaPressed = useKeyPressed(
    isMac() ? ['MetaLeft', 'MetaRight'] : ['ControlLeft', 'ControlRight'],
    () => !isOpen.value,
  );

  const listManager: ListManagerCtx<TValue> = {
    useOptionRegistration(init: OptionRegistration<TValue>) {
      const id = init.id;
      renderedOptions.value.push(init);
      onBeforeUnmount(() => {
        removeFirst(renderedOptions.value, reg => reg.id === id);
      });

      return init;
    },
    isMultiple() {
      return toValue(props.multiple) ?? false;
    },
    isValueSelected: props.isValueSelected,
    toggleValue: props.handleToggleValue,
    getFocusStrategy: () => toValue(props.focusStrategy) ?? 'FOCUS_DOM',
    isPopupOpen: () => isOpen.value,
  };

  provide(ListManagerKey, listManager);

  const handlers = {
    onKeydown(e: KeyboardEvent) {
      if (toValue(props.disabled)) {
        return;
      }

      if (hasKeyCode(e, 'ArrowDown')) {
        e.preventDefault();
        e.stopPropagation();
        focusNext();
        return;
      }

      if (hasKeyCode(e, 'ArrowUp')) {
        e.preventDefault();
        e.stopPropagation();
        focusPrev();
        return;
      }

      if (hasKeyCode(e, 'KeyA') && isMetaPressed.value) {
        e.preventDefault();
        e.stopPropagation();
        props.onToggleAll?.();
        return;
      }

      if (hasKeyCode(e, 'Home') || hasKeyCode(e, 'PageUp')) {
        e.preventDefault();
        e.stopPropagation();
        if (isShiftPressed.value) {
          props.onToggleBefore?.();
        }

        getSortedOptions().at(0)?.focus();
        return;
      }

      if (hasKeyCode(e, 'End') || hasKeyCode(e, 'PageDown')) {
        e.preventDefault();
        e.stopPropagation();
        if (isShiftPressed.value) {
          props.onToggleAfter?.();
        }

        getSortedOptions().at(-1)?.focus();
        return;
      }

      if (hasKeyCode(e, 'Tab')) {
        isOpen.value = false;
        return;
      }

      finder.handleKeydown(e);
    },
  };

  function focusFirst() {
    findFocusedOption()?.unfocus();
    getSortedOptions().at(0)?.focus();
  }

  function focusLast() {
    findFocusedOption()?.unfocus();
    getSortedOptions().at(-1)?.focus();
  }

  function focusAndToggleIfShiftPressed(option: OptionRegistration<TValue>) {
    if (listManager.getFocusStrategy() !== 'FOCUS_DOM') {
      findFocusedOption()?.unfocus();
    }

    option.focus();
    if (isShiftPressed.value) {
      option.toggleSelected();
    }
  }

  function findFocusedOption() {
    return renderedOptions.value.find(o => o.isFocused());
  }

  function getSortedOptions() {
    const domOptions = getDomOptions();

    return domOptions.map(opt => opt._fwOption);
  }

  function getDomOptions() {
    return Array.from(
      listBoxEl.value?.querySelectorAll('[role="option"]:not([hidden])') || [],
    ) as OptionElement<TValue>[];
  }

  function findFocusedIdx() {
    const focusStrategy = listManager.getFocusStrategy();
    const domOptions = getDomOptions();

    const focusedOptionIdx =
      focusStrategy === 'FOCUS_DOM'
        ? domOptions.findIndex(opt => opt.tabIndex === 0)
        : domOptions.findIndex(opt => opt.ariaSelected === 'true');

    return focusedOptionIdx;
  }

  function focusNext() {
    const currentlyFocusedIdx = findFocusedIdx();
    if (currentlyFocusedIdx === -1) {
      focusFirst();
      return;
    }

    const sortedOptions = getSortedOptions();
    for (let i = currentlyFocusedIdx + 1; i < sortedOptions.length; i++) {
      const option = sortedOptions[i];

      if (option && !option.isDisabled()) {
        focusAndToggleIfShiftPressed(option);
        return;
      }
    }
  }

  function focusPrev() {
    const currentlyFocusedIdx = findFocusedIdx();
    const sortedOptions = getSortedOptions();
    if (currentlyFocusedIdx === -1) {
      focusFirst();
      return;
    }

    for (let i = currentlyFocusedIdx - 1; i >= 0; i--) {
      const option = sortedOptions[i];
      if (option && !option.isDisabled()) {
        focusAndToggleIfShiftPressed(option);
        return;
      }
    }
  }

  const listBoxProps = computed<ListBoxDomProps>(() => {
    const isMultiple = toValue(props.multiple);
    const labeledBy = toValue(props.labeledBy);

    return withRefCapture(
      {
        id: listBoxId,
        role: 'listbox',
        'aria-label': labeledBy ? undefined : toValue(props.label),
        'aria-labelledby': labeledBy ?? undefined,
        'aria-multiselectable': isMultiple ?? undefined,
        ...handlers,
      },
      listBoxEl,
      elementRef,
    );
  });

  watch(isOpen, async value => {
    if (!value || toValue(props.disabled) || !toValue(props.autofocusOnOpen)) {
      // If the focus strategy is not FOCUS_ATTR_SELECTED, we need to unfocus the currently focused option when the popup is closed.
      if (listManager.getFocusStrategy() !== 'FOCUS_ATTR_SELECTED') {
        findFocusedOption()?.unfocus();
      }

      return;
    }

    await nextTick();
    const currentlySelected = renderedOptions.value.find(o => o.isSelected());
    if (currentlySelected && !currentlySelected?.isDisabled()) {
      currentlySelected.focus();
      return;
    }

    focusNext();
  });

  function mapOption(opt: OptionRegistration<TValue>) {
    return {
      id: opt.id,
      value: opt.getValue(),
      label: opt.getLabel(),
    };
  }

  const selectedOption = computed(() => {
    const opt = renderedOptions.value.find(opt => opt.isSelected());

    return opt ? mapOption(opt) : undefined;
  });

  const selectedOptions = computed(() => {
    return renderedOptions.value.filter(opt => opt.isSelected()).map(opt => mapOption(opt));
  });

  const isEmpty = computed(() => {
    return !renderedOptions.value.length || renderedOptions.value.every(opt => opt.isHidden());
  });

  return {
    listBoxId,
    listBoxProps,
    isPopupOpen: isOpen,
    renderedOptions,
    isShiftPressed,
    listBoxEl,
    selectedOption,
    selectedOptions,
    isEmpty,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
    findFocusedOption,
  };
}
