import { MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue';
import { Arrayable, Maybe } from '../types';
import { normalizeArrayable } from '../utils/common';

export function useEventListener(
  targetRef: MaybeRefOrGetter<Maybe<HTMLElement>>,
  event: Arrayable<string>,
  listener: EventListener,
) {
  function cleanup(el: HTMLElement) {
    const events = normalizeArrayable(event);

    events.forEach(evt => {
      el.removeEventListener(evt, listener);
    });
  }

  function setup(el: HTMLElement) {
    const events = normalizeArrayable(event);

    events.forEach(evt => {
      el.addEventListener(evt, listener);
    });
  }

  const stop = watch(
    () => toValue(targetRef),
    (target, oldTarget) => {
      if (oldTarget) {
        cleanup(oldTarget);
      }

      if (target) {
        setup(target);
      }
    },
  );

  onBeforeUnmount(() => {
    const target = toValue(targetRef);
    if (target) {
      cleanup(target);
    }

    stop();
  });
}
