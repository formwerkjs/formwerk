import { toValue } from 'vue';
import { Reactivify } from '../types';
import { normalizeProps, lowPriority } from '../utils/common';
import { useFormField, exposeField, FieldBaseProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { SwitchControlProps, useSwitchControl } from './useSwitchControl';

export type SwitchProps<TValue = boolean> = SwitchControlProps<TValue> & FieldBaseProps<TValue>;

export function useSwitch<TValue = boolean>(_props: Reactivify<SwitchProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<unknown>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: toValue(props.modelValue) ?? toValue(props.falseValue) ?? lowPriority(false),
    disabled: props.disabled,
    schema: props.schema,
  });

  const { inputEl, inputProps, isPressed, togglePressed } = useSwitchControl(props, { field });

  if (__DEV__) {
    registerField(field, 'Switch');
  }

  return exposeField(
    {
      /**
       * Props for the error message element.
       */
      errorMessageProps: field.errorMessageProps,
      /**
       * Reference to the input element.
       */
      inputEl,
      /**
       * Props for the input element.
       */
      inputProps,
      /**
       * Whether the switch is pressed.
       */
      isPressed,
      /**
       * Props for the label element.
       */
      labelProps: field.labelProps,
      /**
       * Toggles the pressed state of the switch.
       */
      togglePressed,
    },
    field,
  );
}
