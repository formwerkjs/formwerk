import { ComponentInternalInstance, nextTick, onBeforeUnmount } from 'vue';
import { isSSR, useUniqId } from './common';
import { NOOP } from '../constants';

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

    document.addEventListener(evtName, handlerWrapper as any, { signal: controller.signal });

    const removeListener = () => document.removeEventListener(evtName, handlerWrapper as any);
    onBeforeUnmount(removeListener, vm);

    return removeListener;
  }

  onBeforeUnmount(() => {
    controller.abort();
  });

  return [dispatch, addListener] as const;
}
