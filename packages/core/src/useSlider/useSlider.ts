import { toValue } from 'vue';
import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { useFormField, exposeField, FieldBaseProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { SliderControlProps, useSliderControl } from './useSliderControl';

export type SliderProps<TValue = number> = SliderControlProps<TValue> & FieldBaseProps<TValue>;

export function useSlider<TValue>(_props: Reactivify<SliderProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const field = useFormField<Arrayable<TValue | undefined>>({
    label: props.label,
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as TValue,
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useSliderControl<Arrayable<TValue | undefined>>(props as Reactivify<SliderControlProps<TValue>>, {
    field,
  });

  if (__DEV__) {
    registerField(field, 'Slider');
  }

  return exposeField(control, field);
}
