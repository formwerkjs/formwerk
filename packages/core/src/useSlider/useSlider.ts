import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { getSliderFieldProps, SliderControlProps, useSliderControl } from './useSliderControl';

export type SliderProps<TValue = number> = WithFieldProps<SliderControlProps<TValue>>;

export function useSlider<TValue>(_props: Reactivify<SliderProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const _field = useFormField(getSliderFieldProps<TValue>(props as any));

  const control = useSliderControl<TValue>({
    ...props,
    _field,
  } as any);

  if (__DEV__) {
    registerField(_field, 'Slider');
  }

  return control;
}
