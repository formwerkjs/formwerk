import { ComponentInternalInstance, nextTick, onBeforeUnmount } from 'vue';
import { isSSR, tryOnScopeDispose, useUniqId } from './common';
import { NOOP } from '../constants';
import { EventHandler } from '../types';

export function createEventDispatcher<TPayload>(eventName?: string) {
  const evtName = `formwerk:${useUniqId(eventName)}`;
  const controller = new AbortController();
  function dispatch(payload: TPayload) {
    if (isSSR) {
      return Promise.resolve();
    }

    document.dispatchEvent(new CustomEvent(evtName, { detail: payload }));

    return nextTick();
  }

  function addListener(handler: (payload: TPayload) => void, vm?: ComponentInternalInstance) {
    if (isSSR) {
      return NOOP;
    }

    const handlerWrapper = (e: CustomEvent<TPayload>) => {
      handler(e.detail);
    };

    document.addEventListener(evtName, handlerWrapper as EventHandler, { signal: controller.signal });

    const removeListener = () => document.removeEventListener(evtName, handlerWrapper as EventHandler);
    onBeforeUnmount(removeListener, vm);

    return removeListener;
  }

  tryOnScopeDispose(() => {
    controller.abort();
  });

  return [dispatch, addListener] as const;
}

export function onlyMainMouseButton(cb: () => unknown) {
  return (event: MouseEvent) => {
    if (event.button === 0) {
      cb();
    }
  };
}

export function blockEvent(evt: Event) {
  evt.preventDefault();
  evt.stopPropagation();
  evt.stopImmediatePropagation();
}
