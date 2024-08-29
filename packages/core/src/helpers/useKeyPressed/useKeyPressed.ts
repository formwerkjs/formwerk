import { MaybeRefOrGetter, shallowRef } from 'vue';
import { useEventListener } from '../useEventListener';
import { Arrayable } from '../../types';
import { isCallable, normalizeArrayable } from '../../utils/common';

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

  // We don't care if the multiple keys can be pressed to trigger it initially
  // because it's a rare case and it's not worth the complexity, user can split it into multiple hooks
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
