import { ref } from 'vue';
import { FormField } from '../useFormField';
import { useSyncModel } from './useModelSync';

/**
 * A proxy for the model value of a field, if the field is not provided, a local ref is created.
 */
export function useVModelProxy<T = unknown>(field: FormField<T>) {
  const model = field?.fieldValue ?? ref<T>();

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
