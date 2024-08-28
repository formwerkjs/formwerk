import { Ref, shallowRef, watch } from 'vue';
import { useEventListener } from './useEventListener';
import { Maybe } from '../types';

export function usePopoverController(popoverEl: Ref<Maybe<HTMLElement>>) {
  const isOpen = shallowRef(false);

  watch(isOpen, value => {
    const el = popoverEl.value;
    if (!el || !el.popover) {
      return;
    }

    if (value === el.matches(':popover-open')) {
      return;
    }

    if (value) {
      el.showPopover();
      return;
    }

    el.hidePopover();
  });

  useEventListener(popoverEl, 'toggle', (e: ToggleEvent) => {
    const shouldBeOpen = e.newState === 'open';
    if (isOpen.value === shouldBeOpen) {
      return;
    }

    isOpen.value = shouldBeOpen;
  });

  return {
    isOpen,
  };
}
