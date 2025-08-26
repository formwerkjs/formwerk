import { toValue } from 'vue';
import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, FieldBaseProps, useFormField } from '../useFormField';
import { registerField } from '@formwerk/devtools';
import { ComboBoxCollectionOptions, ComboBoxControlProps, useComboBoxControl } from './useComboxBoxControl';

export type ComboBoxProps<TOption, TValue = TOption> = ComboBoxControlProps<TOption, TValue> & FieldBaseProps<TValue>;

export function useComboBox<TOption, TValue = TOption>(
  _props: Reactivify<ComboBoxProps<TOption, TValue>, 'schema' | 'onNewValue'>,
  collectionOptions?: Partial<ComboBoxCollectionOptions>,
) {
  const props = normalizeProps(_props, ['schema', 'onNewValue']);
  const field = useFormField<TValue>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as TValue,
    disabled: props.disabled,
    schema: props.schema,
  });

  const control = useComboBoxControl<TOption, TValue>(props as ComboBoxControlProps<TOption, TValue>, {
    ...collectionOptions,
    field,
  });

  if (__DEV__) {
    registerField(field, 'ComboBox');
  }

  return exposeField(control, field);
}
