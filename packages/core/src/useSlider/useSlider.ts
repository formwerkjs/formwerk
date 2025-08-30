import { Arrayable, Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { resolveFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { SliderControlProps, useSliderControl } from './useSliderControl';

export type SliderProps<TValue = number> = WithFieldProps<SliderControlProps<TValue>>;

export function useSlider<TValue>(_props: Reactivify<SliderProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField<Arrayable<TValue> | undefined>(resolveFieldInit(props));
  const control = useSliderControl({
    ...props,
    _field: _field as any,
  });

  if (__DEV__) {
    registerField(_field, 'Slider');
  }

  return control;
}
