import { ref } from 'vue';
import { Maybe } from '../types';
import { FormField } from '../useFormField';
import { useSyncModel } from './useModelSync';

/**
 * A proxy for the model value of a field, if the field is not provided, a local ref is created.
 */
export function useVModelProxy<T = unknown>(field: Maybe<FormField<T>>) {
  const model = field?.fieldValue ?? ref<T>();

  function setModelValue(value: T | undefined) {
    if (field) {
      field.setValue(value);
      return;
    }

    model.value = value;
  }

  useSyncModel({
    model,
    modelName: 'modelValue',
    onModelPropUpdated: setModelValue,
  });

  return {
    model,
    setModelValue,
  };
}
