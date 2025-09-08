import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { SliderControlProps, useSliderControl } from './useSliderControl';

export type SliderProps<TValue = number> = WithFieldProps<SliderControlProps<TValue>>;

export function useSlider<TValue>(_props: Reactivify<SliderProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<Arrayable<TValue> | undefined>(getFieldInit(props));
  const control = useSliderControl({
    ...(props as SliderControlProps<TValue>),
    _field,
  });

  return exposeField(control, _field);
}
