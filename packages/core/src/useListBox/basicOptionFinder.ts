import { Ref } from 'vue';
import { type OptionRegistrationWithId } from './useListBox';

const SEARCH_CLEAR_TIMEOUT = 500;

export function useBasicOptionFinder(options: Ref<OptionRegistrationWithId<unknown>[]>) {
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

export type OptionFinder = typeof useBasicOptionFinder;
