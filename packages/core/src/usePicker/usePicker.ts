import { computed, InjectionKey, provide, ref, toValue } from 'vue';
import { usePopoverController } from '../helpers/usePopoverController';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { normalizeProps, withRefCapture } from '../utils/common';
import { Reactivify } from '../types';
import { useControlButtonProps } from '../helpers/useControlButtonProps';

export interface PickerProps {
  /**
   * Whether the picker is disabled.
   */
  disabled?: boolean;

  /**
   * The label for the picker.
   */
  label: string;
}

export interface PickerContext {
  isOpen: () => boolean;
  close: () => void;
}

export const PickerContextKey: InjectionKey<PickerContext> = Symbol('PickerContext');

export function usePicker(_props: Reactivify<PickerProps>) {
  const props = normalizeProps(_props);
  const pickerEl = ref<HTMLElement>();
  const disabled = createDisabledContext(props.disabled);

  const { isOpen } = usePopoverController(pickerEl, { disabled });

  const pickerProps = computed(() => {
    return withRefCapture(
      {
        role: 'dialog',
        'aria-modal': 'true' as const,
        'aria-label': toValue(props.label),
      },
      pickerEl,
    );
  });

  function onOpen() {
    isOpen.value = true;
  }

  const pickerTriggerProps = useControlButtonProps(() => {
    return {
      'aria-label': toValue(props.label),
      disabled: disabled.value,
      onClick: onOpen,
    };
  });

  provide(PickerContextKey, {
    isOpen: () => isOpen.value,
    close: () => (isOpen.value = false),
  });

  return {
    /**
     * Whether the picker should be open.
     */
    isOpen,

    /**
     * The props for the picker element.
     */
    pickerProps,

    /**
     * The props for the picker trigger element.
     */
    pickerTriggerProps,
  };
}
