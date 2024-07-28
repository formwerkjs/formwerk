import { ComponentInternalInstance, nextTick, onBeforeUnmount } from 'vue';
import { isSSR, uniqId } from './common';

export function createEventDispatcher<TPayload>(eventName?: string) {
  const evtName = `formwerk:${eventName ? eventName + '-' : ''}${uniqId()}`;
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
      return () => {};
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
