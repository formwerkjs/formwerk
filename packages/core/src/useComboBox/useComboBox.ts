import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { exposeField, getFieldInit, useFormField, WithFieldProps } from '../useFormField';
import { ComboBoxCollectionOptions, ComboBoxControlProps, useComboBoxControl } from './useComboBoxControl';

export type ComboBoxProps<TOption, TValue = TOption> = WithFieldProps<ComboBoxControlProps<TOption, TValue>>;

export function useComboBox<TOption, TValue = TOption>(
  _props: Reactivify<ComboBoxProps<TOption, TValue>, 'schema' | 'onNewValue'>,
  collectionOptions?: Partial<ComboBoxCollectionOptions>,
) {
  const props = normalizeProps(_props, ['schema', 'onNewValue']);
  const _field = useFormField<TValue | undefined>(getFieldInit<TValue>(props));
  const control = useComboBoxControl<TOption, TValue>(
    { ...(props as unknown as ComboBoxControlProps<TOption, TValue>), _field },
    collectionOptions,
  );

  return exposeField(control, _field);
}
