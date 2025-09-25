import { MaybeRefOrGetter, onMounted, Ref, shallowRef, toValue, watch } from 'vue';
import { useEventListener } from '../useEventListener';
import { Maybe } from '../../types';

interface ControllerInit {
  disabled?: MaybeRefOrGetter<boolean | undefined>;
  triggerEl?: MaybeRefOrGetter<Maybe<HTMLElement>>;
}

export function usePopoverController(popoverEl: Ref<Maybe<HTMLElement>>, opts?: ControllerInit) {
  const isOpen = shallowRef(false);

  watch(isOpen, value => {
    const el = popoverEl.value;
    if (!el || !el.popover || toValue(opts?.disabled)) {
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

  useEventListener(
    popoverEl,
    'toggle',
    (e: ToggleEvent) => {
      const shouldBeOpen = e.newState === 'open';
      if (isOpen.value === shouldBeOpen) {
        return;
      }

      isOpen.value = shouldBeOpen;
    },
    {
      disabled: opts?.disabled,
    },
  );

  // Click outside listener
  useEventListener(
    window,
    'click',
    (e: MouseEvent) => {
      if (e.target instanceof HTMLElement) {
        if (popoverEl.value?.contains(e.target)) {
          return;
        }

        const triggerEl = toValue(opts?.triggerEl);
        if (triggerEl?.contains(e.target)) {
          return;
        }
      }

      isOpen.value = false;
    },
    { disabled: () => toValue(opts?.disabled) || !isOpen.value },
  );

  useEventListener(opts?.triggerEl, ['focus'], () => {
    isOpen.value = true;
  });

  onMounted(() => {
    if (popoverEl.value) {
      popoverEl.value.popover = 'manual';
    }
  });

  return {
    isOpen,
  };
}
