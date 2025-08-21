import { ref } from 'vue';
import { Maybe } from '../types';
import { FormField } from '../useFormField';
import { useSyncModel } from './useModelSync';

/**
 * A proxy for the model value of a field, if the field is not provided, a local ref is created.
 */
export function useVModelProxy(field: Maybe<FormField>) {
  const model = field?.fieldValue ?? ref('');

  function setValue(value: unknown) {
    if (field) {
      field.setValue(value);
      return;
    }

    model.value = value;
  }

  useSyncModel({
    model,
    modelName: 'modelValue',
    onModelPropUpdated: setValue,
  });

  return model;
}
