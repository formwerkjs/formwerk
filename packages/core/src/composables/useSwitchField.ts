import { MaybeRefOrGetter, Ref, computed, shallowRef, toValue } from 'vue';
import { AriaDescribableProps, AriaLabelableProps, InputBaseAttributes, InputEvents } from '../types/common';
import { createLabelProps, uniqId, withRefCapture } from '../utils/common';
import { useFieldValue } from './useFieldValue';

export interface SwitchInputDOMProps
  extends InputBaseAttributes,
    AriaLabelableProps,
    AriaDescribableProps,
    InputEvents {
  id: string;
  checked: boolean;
  name?: string;
  role?: string;
}

export type SwitchFieldProps = {
  label: MaybeRefOrGetter<string>;
  name?: MaybeRefOrGetter<string>;
  modelValue?: MaybeRefOrGetter<boolean>;

  readonly?: MaybeRefOrGetter<boolean>;
  disabled?: MaybeRefOrGetter<boolean>;
};

export function useSwitchField(props: SwitchFieldProps, elementRef?: Ref<HTMLInputElement>) {
  const id = uniqId();
  const inputRef = elementRef || shallowRef<HTMLInputElement>();
  const { fieldValue: isPressed } = useFieldValue(toValue(props.modelValue) ?? false);
  const labelProps = createLabelProps(id);

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

  function handleClick() {
    togglePressed();
  }

  /**
   * Use this if you are using a native input[type=checkbox] element.
   */
  const inputProps = computed<SwitchInputDOMProps>(() =>
    withRefCapture(
      {
        id: id,
        name: toValue(props.name),
        'aria-labelledby': labelProps.id,
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
    role: 'switch',
    tabindex: '0',
    'aria-checked': isPressed.value ?? false,
    'aria-labelledby': labelProps.id,
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
    handleClick,
  };
}
