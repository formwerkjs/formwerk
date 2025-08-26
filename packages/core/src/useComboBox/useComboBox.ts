import { toValue } from 'vue';
import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, useFormField, WithFieldProps } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { ComboBoxCollectionOptions, ComboBoxControlProps, useComboBoxControl } from './useComboBoxControl';

export type ComboBoxProps<TOption, TValue = TOption> = WithFieldProps<ComboBoxControlProps<TOption, TValue>, TValue>;

export function useComboBox<TOption, TValue = TOption>(
  _props: Reactivify<ComboBoxProps<TOption, TValue>, 'schema' | 'onNewValue'>,
  collectionOptions?: Partial<ComboBoxCollectionOptions>,
) {
  const props = normalizeProps(_props, ['schema', 'onNewValue']);
  const _field = useFormField<TValue>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as TValue,
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useComboBoxControl<TOption, TValue>(
    { ...(props as ComboBoxControlProps<TOption, TValue>), _field },
    collectionOptions,
  );

  if (__DEV__) {
    registerField(_field, 'ComboBox');
  }

  return exposeField(control, _field);
}
