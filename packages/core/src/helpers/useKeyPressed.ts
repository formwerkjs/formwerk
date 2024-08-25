import { useEventListener } from './useEventListener';
import { MaybeRefOrGetter, shallowRef } from 'vue';
import { Arrayable } from '../types';
import { isCallable, normalizeArrayable } from '../utils/common';

export function useKeyPressed(
  codes: Arrayable<string> | ((evt: KeyboardEvent) => boolean),
  disabled?: MaybeRefOrGetter<boolean>,
) {
  const isPressed = shallowRef(false);
  const predicate = isCallable(codes) ? codes : (e: KeyboardEvent) => normalizeArrayable(codes).includes(e.code);
  function onKeydown(e: KeyboardEvent) {
    if (predicate(e)) {
      isPressed.value = true;
    }
  }

  function onKeyup(e: KeyboardEvent) {
    if (predicate(e)) {
      isPressed.value = false;
    }
  }

  useEventListener(
    window,
    'keydown',
    e => {
      onKeydown(e as KeyboardEvent);
    },
    { disabled },
  );

  useEventListener(
    window,
    'keyup',
    e => {
      const keyEvt = e as KeyboardEvent;
      onKeyup(keyEvt);
    },
    { disabled: () => !isPressed.value },
  );

  return isPressed;
}
