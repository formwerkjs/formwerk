import { MaybeRefOrGetter, Ref, computed, shallowRef, toValue } from 'vue';
import { AriaDescribableProps, AriaLabelableProps, InputBaseAttributes, InputEvents } from '@core/types/common';
import { uniqId, withRefCapture } from '@core/utils/common';
import { useFieldValue } from '@core/composables/useFieldValue';
import { useLabel } from '@core/composables/useLabel';

export interface SwitchDOMProps extends InputBaseAttributes, AriaLabelableProps, AriaDescribableProps, InputEvents {
  id: string;
  checked: boolean;
  name?: string;
  role?: string;
}

export type SwitchProps = {
  label?: MaybeRefOrGetter<string>;
  name?: MaybeRefOrGetter<string>;
  modelValue?: MaybeRefOrGetter<boolean>;

  readonly?: MaybeRefOrGetter<boolean>;
  disabled?: MaybeRefOrGetter<boolean>;
};

export function useSwitch(props: SwitchProps, elementRef?: Ref<HTMLInputElement>) {
  const id = uniqId();
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const { fieldValue: isPressed } = useFieldValue(toValue(props.modelValue) ?? false);
  const { labelProps, labelledByProps } = useLabel({
    for: id,
    label: props.label,
    targetRef: inputRef,
  });

  const handlers: InputEvents = {
    onKeydown: (evt: KeyboardEvent) => {
      if (evt.code === 'Space' || evt.key === 'Enter') {
        evt.preventDefault();
        togglePressed();
      }
    },
    onChange(event) {
      isPressed.value = (event.target as HTMLInputElement).checked;
    },
    onInput(event) {
      isPressed.value = (event.target as HTMLInputElement).checked;
    },
  };

  function onClick() {
    togglePressed();
  }

  /**
   * Use this if you are using a native input[type=checkbox] element.
   */
  const inputProps = computed<SwitchDOMProps>(() =>
    withRefCapture(
      {
        ...labelledByProps.value,
        id: id,
        name: toValue(props.name),
        disabled: toValue(props.disabled),
        readonly: toValue(props.readonly),
        checked: isPressed.value ?? false,
        role: 'switch',
        ...handlers,
      },
      inputRef,
      elementRef,
    ),
  );

  /**
   * Use this if you are using divs or buttons
   */
  const switchProps = computed(() => ({
    ...labelledByProps.value,
    role: 'switch',
    tabindex: '0',
    'aria-checked': isPressed.value ?? false,
    'aria-readonly': toValue(props.readonly) ?? undefined,
    'aria-disabled': toValue(props.disabled) ?? undefined,
    onKeydown: handlers.onKeydown,
    onClick,
  }));

  function togglePressed(force?: boolean) {
    isPressed.value = force ?? !isPressed.value;
  }

  return {
    isPressed,
    inputRef,
    labelProps,
    inputProps,
    switchProps,
    togglePressed,
  };
}
