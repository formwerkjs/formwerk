import { isRef, MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue';
import { Arrayable, Maybe } from '../types';
import { isCallable, normalizeArrayable } from '../utils/common';

interface ListenerOptions {
  disabled?: MaybeRefOrGetter<boolean>;
}

export function useEventListener<TEvent extends Event>(
  targetRef: MaybeRefOrGetter<Maybe<EventTarget>>,
  event: Arrayable<string>,
  listener: (e: TEvent) => unknown,
  opts?: ListenerOptions,
) {
  function cleanup(el: EventTarget) {
    const events = normalizeArrayable(event);

    events.forEach(evt => {
      el.removeEventListener(evt, listener as EventListener);
    });
  }

  function setup(el: EventTarget) {
    if (toValue(opts?.disabled)) {
      return;
    }

    const events = normalizeArrayable(event);

    events.forEach(evt => {
      el.addEventListener(evt, listener as EventListener);
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

  if (isCallable(opts?.disabled) || isRef(opts?.disabled)) {
    watch(opts.disabled, value => {
      const target = toValue(targetRef);
      if (!value && target) {
        setup(target);
      }
    });
  }
}
