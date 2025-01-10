import { computed, InjectionKey, nextTick, onBeforeUnmount, provide, ref, Ref, toValue, watch } from 'vue';
import { AriaLabelableProps, Maybe, Orientation, Reactivify } from '../types';
import { hasKeyCode, normalizeProps, removeFirst, useUniqId, withRefCapture } from '../utils/common';
import { useKeyPressed } from '../helpers/useKeyPressed';
import { isMac } from '../utils/platform';
import { usePopoverController } from '../helpers/usePopoverController';
import { FieldTypePrefixes } from '../constants';

const SEARCH_CLEAR_TIMEOUT = 500;

export interface ListBoxProps<TOption, TValue = TOption> {
  label: string;
  isValueSelected(value: TValue): boolean;
  handleToggleValue(value: TValue): void;

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
  toggleSelected(): void;
}

export interface OptionRegistrationWithId<TValue> extends OptionRegistration<TValue> {
  id: string;
}

export interface ListManagerCtx<TValue = unknown> {
  useOptionRegistration(init: OptionRegistration<TValue>): void;
  isValueSelected(value: TValue): boolean;
  isMultiple(): boolean;
  toggleValue(value: TValue, force?: boolean): void;
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
  const options = ref<OptionRegistrationWithId<TValue>[]>([]);
  // Initialize popover controller, NO-OP if the element is not a popover-enabled element.
  const { isOpen } = usePopoverController(listBoxEl, { disabled: props.disabled });
  const finder = useOptionFinder(options);
  const isShiftPressed = useKeyPressed(['ShiftLeft', 'ShiftRight'], () => !isOpen.value);
  const isMetaPressed = useKeyPressed(
    isMac() ? ['MetaLeft', 'MetaRight'] : ['ControlLeft', 'ControlRight'],
    () => !isOpen.value,
  );

  const listManager: ListManagerCtx<TValue> = {
    useOptionRegistration(init: OptionRegistration<TValue>) {
      const id = init.id;
      options.value.push(init);
      onBeforeUnmount(() => {
        removeFirst(options.value, reg => reg.id === id);
      });
    },
    isMultiple() {
      return toValue(props.multiple) ?? false;
    },
    isValueSelected: props.isValueSelected,
    toggleValue: props.handleToggleValue,
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

        options.value.at(0)?.focus();
        return;
      }

      if (hasKeyCode(e, 'End') || hasKeyCode(e, 'PageDown')) {
        e.preventDefault();
        e.stopPropagation();
        if (isShiftPressed.value) {
          props.onToggleAfter?.();
        }

        options.value.at(-1)?.focus();
        return;
      }

      if (hasKeyCode(e, 'Tab')) {
        isOpen.value = false;
        return;
      }

      finder.handleKeydown(e);
    },
  };

  function focusAndToggleIfShiftPressed(idx: number) {
    options.value[idx]?.focus();
    if (isShiftPressed.value) {
      options.value[idx]?.toggleSelected();
    }
  }

  function findFocused() {
    return options.value.findIndex(o => o.isFocused());
  }

  function focusNext() {
    const currentlyFocusedIdx = findFocused();
    for (let i = currentlyFocusedIdx + 1; i < options.value.length; i++) {
      if (!options.value[i].isDisabled()) {
        focusAndToggleIfShiftPressed(i);
        return;
      }
    }
  }

  function focusPrev() {
    const currentlyFocusedIdx = findFocused();
    if (currentlyFocusedIdx === -1) {
      focusNext();
      return;
    }

    for (let i = currentlyFocusedIdx - 1; i >= 0; i--) {
      if (!options.value[i].isDisabled()) {
        focusAndToggleIfShiftPressed(i);
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
      return;
    }

    await nextTick();
    const currentlySelected = options.value.find(o => o.isSelected());
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
    const opt = options.value.find(opt => opt.isSelected());

    return opt ? mapOption(opt) : undefined;
  });

  const selectedOptions = computed(() => {
    return options.value.filter(opt => opt.isSelected()).map(opt => mapOption(opt));
  });

  return {
    listBoxId,
    listBoxProps,
    isPopupOpen: isOpen,
    options,
    isShiftPressed,
    listBoxEl,
    selectedOption,
    selectedOptions,
  };
}

function useOptionFinder(options: Ref<OptionRegistrationWithId<unknown>[]>) {
  let keysSoFar: string = '';
  let clearKeysTimeout: number | null = null;

  function findOption(key: string) {
    const lowerKey = key.toLowerCase();
    let startIdx = 0;
    if (!keysSoFar) {
      const focusedIdx = options.value.findIndex(o => o.isFocused());
      startIdx = focusedIdx === -1 ? 0 : focusedIdx;
    }

    // Append the key to the keysSoFar
    keysSoFar += lowerKey;
    // Clear the keys after a timeout so that the next key press starts a new search
    scheduleClearKeys();

    // +1 to skip the currently focused one
    let match = findWithinRange(startIdx + 1, options.value.length);
    if (!match) {
      // Flip the search range and try again if not found in the first pass
      match = findWithinRange(0, startIdx);
    }

    return match;
  }

  function findWithinRange(startIdx: number, endIdx: number) {
    // Better than slice because we don't have to worry about inclusive/exclusive.
    for (let i = startIdx; i < endIdx; i++) {
      const option = options.value[i];
      if (option.getLabel().toLowerCase().startsWith(keysSoFar)) {
        return option;
      }
    }

    return null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key.length === 1) {
      findOption(e.key)?.focus();
    }
  }

  function scheduleClearKeys() {
    if (clearKeysTimeout) {
      clearTimeout(clearKeysTimeout);
    }

    clearKeysTimeout = window.setTimeout(clearKeys, SEARCH_CLEAR_TIMEOUT);
  }

  function clearKeys() {
    keysSoFar = '';
    clearKeysTimeout = null;
  }

  return {
    keysSoFar,
    handleKeydown,
    clearKeys,
  };
}
