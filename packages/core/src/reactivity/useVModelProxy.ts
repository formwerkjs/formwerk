import { ref } from 'vue';
import { FieldState } from '../useFormField';
import { useSyncModel } from './useModelSync';

/**
 * A proxy for the model value of a field, if the field is not provided, a local ref is created.
 */
export function useVModelProxy<T = unknown>(field: FieldState<T>) {
  const model = field.fieldValue ?? ref<T>();

  useSyncModel({
    model,
    modelName: 'modelValue',
    onModelPropUpdated: field.setValue,
  });

  return {
    model,
    setModelValue: field.setValue,
  };
}
