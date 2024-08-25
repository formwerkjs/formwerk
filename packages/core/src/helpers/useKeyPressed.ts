import { useEventListener } from './useEventListener';
import { MaybeRefOrGetter, shallowRef } from 'vue';
import { Arrayable } from '../types';

export function useKeyPressed(codes: Arrayable<string>, disabled?: MaybeRefOrGetter<boolean>) {
  const isPressed = shallowRef(false);
  function onKeydown(e: KeyboardEvent) {
    if (codes.includes(e.code)) {
      isPressed.value = true;
    }
  }

  function onKeyup(e: KeyboardEvent) {
    if (codes.includes(e.code)) {
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
