import { toValue } from 'vue';
import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { useFormField, exposeField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { SliderControlProps, useSliderControl } from './useSliderControl';

export type SliderProps<TValue = number> = WithFieldProps<SliderControlProps<TValue>, TValue>;

export function useSlider<TValue>(_props: Reactivify<SliderProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<Arrayable<TValue | undefined>>({
    label: props.label,
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as TValue,
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useSliderControl<Arrayable<TValue | undefined>>({
    ...(props as SliderControlProps<TValue>),
    _field,
  });

  if (__DEV__) {
    registerField(_field, 'Slider');
  }

  return exposeField(control, _field);
}
