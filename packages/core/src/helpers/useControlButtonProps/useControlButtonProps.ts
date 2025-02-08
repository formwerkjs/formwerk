import { computed, shallowRef } from 'vue';
import { isButtonElement, withRefCapture } from '../../utils/common';

interface ControlButtonProps {
  [key: string]: unknown;
  disabled?: boolean;
}

export function useControlButtonProps(props: () => ControlButtonProps) {
  const buttonEl = shallowRef<HTMLElement>();

  const buttonProps = computed(() => {
    const isBtn = isButtonElement(buttonEl.value);
    const { disabled, ...rest } = props();

    return withRefCapture(
      {
        type: isBtn ? ('button' as const) : undefined,
        role: isBtn ? undefined : 'button',
        [isBtn ? 'disabled' : 'aria-disabled']: disabled || undefined,
        tabindex: '-1',
        ...rest,
      },
      buttonEl,
    );
  });

  return buttonProps;
}
