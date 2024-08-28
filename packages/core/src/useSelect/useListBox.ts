import { Maybe, Orientation, Reactivify } from '../types';
import { computed, InjectionKey, nextTick, onBeforeUnmount, provide, ref, Ref, shallowRef, toValue, watch } from 'vue';
import { normalizeProps, removeFirst, withRefCapture } from '../utils/common';
import { useKeyPressed } from '../helpers/useKeyPressed';
import { isMac } from '../utils/platform';
import { usePopoverController } from '../helpers/usePopoverController';

const SEARCH_CLEAR_TIMEOUT = 500;

export interface ListBoxProps {
  multiple?: boolean;
  orientation?: Orientation;

  onToggleAll?(): void;
  onToggleBefore?(): void;
  onToggleAfter?(): void;
}

export interface ListBoxDomProps {
  role: 'listbox';
  'aria-multiselectable'?: boolean;
  'aria-activedescendant'?: string;
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

export interface ListManagerCtx<TOption = unknown> {
  useOptionRegistration(init: OptionRegistration<TOption>): void;
}

export const ListManagerKey: InjectionKey<ListManagerCtx> = Symbol('ListManagerKey');

export function useListBox<TOption, TValue = TOption>(
  _props: Reactivify<ListBoxProps>,
  elementRef?: Ref<Maybe<HTMLElement>>,
) {
  const props = normalizeProps(_props);
  const listBoxRef = elementRef || ref<HTMLElement>();
  const options = shallowRef<OptionRegistrationWithId<TValue>[]>([]);
  // Initialize popover controller, NO-OP if the element is not a popover-enabled element.
  const { isOpen } = usePopoverController(listBoxRef);
  const finder = useOptionFinder(options);
  const isShiftPressed = useKeyPressed(['ShiftLeft', 'ShiftRight'], () => !isOpen.value);
  const isMetaPressed = useKeyPressed(
    isMac() ? ['MetaLeft', 'MetaRight'] : ['ControlLeft', 'ControlRight'],
    () => !isOpen.value,
  );

  const listManager: ListManagerCtx = {
    useOptionRegistration(init: OptionRegistration<TValue>) {
      const id = init.id;
      options.value.push(init);
      onBeforeUnmount(() => {
        removeFirst(options.value, reg => reg.id === id);
      });
    },
  };

  provide(ListManagerKey, listManager);

  const handlers = {
    onKeydown(e: KeyboardEvent) {
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        focusNext();
        return;
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        focusPrev();
        return;
      }

      if (e.code === 'KeyA' && isMetaPressed.value) {
        e.preventDefault();
        e.stopPropagation();
        props.onToggleAll?.();
        return;
      }

      if (e.code === 'Home') {
        e.preventDefault();
        e.stopPropagation();
        if (isShiftPressed.value) {
          props.onToggleBefore?.();
        }

        options.value.at(0)?.focus();
        return;
      }

      if (e.code === 'End') {
        e.preventDefault();
        e.stopPropagation();
        if (isShiftPressed.value) {
          props.onToggleAfter?.();
        }

        options.value.at(-1)?.focus();
        return;
      }

      if (e.code === 'Tab') {
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
    // Focus first one if none is focused
    if (currentlyFocusedIdx === -1) {
      focusAndToggleIfShiftPressed(0);
      return;
    }

    const nextIdx = Math.min(currentlyFocusedIdx + 1, options.value.length - 1);
    focusAndToggleIfShiftPressed(nextIdx);
  }

  function focusPrev() {
    const currentlyFocusedIdx = findFocused();
    // Focus first one if none is focused
    if (currentlyFocusedIdx === -1) {
      focusAndToggleIfShiftPressed(0);
      return;
    }

    const nextIdx = Math.max(currentlyFocusedIdx - 1, 0);
    focusAndToggleIfShiftPressed(nextIdx);
  }

  const listBoxProps = computed<ListBoxDomProps>(() => {
    const isMultiple = toValue(props.multiple);
    const option = !isMultiple && isOpen.value ? options.value.find(o => o.isFocused()) : undefined;

    return withRefCapture(
      {
        role: 'listbox',
        'aria-multiselectable': isMultiple ?? undefined,
        'aria-activedescendant': option?.id ?? undefined,
        ...handlers,
      },
      listBoxRef,
      elementRef,
    );
  });

  watch(isOpen, async value => {
    if (!value) {
      return;
    }

    await nextTick();
    const currentlySelected = options.value.findIndex(o => o.isSelected());
    const toBeSelected = currentlySelected === -1 ? 0 : currentlySelected;
    options.value[toBeSelected]?.focus();
  });

  return {
    listBoxProps,
    isOpen,
    options,
    isShiftPressed,
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
