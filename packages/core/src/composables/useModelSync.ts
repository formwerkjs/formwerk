import { MaybeRefOrGetter, getCurrentInstance, toValue, watch } from 'vue';
import { isEqual } from '../utils/common';

export type SyncModelOptions<TValue = unknown> = {
  model: MaybeRefOrGetter<TValue>;
  modelName?: string;
  onModelPropUpdated?: (value: TValue) => void;
};

export function useSyncModel<TValue = unknown>(opts: SyncModelOptions<TValue>) {
  const vm = getCurrentInstance();
  if (!vm) {
    return;
  }

  const { model, modelName = 'modelValue', onModelPropUpdated } = opts;

  const getModelPropValue = () => vm.props[modelName] as TValue;

  watch(
    () => toValue(model),
    value => {
      if (!isEqual(getModelPropValue(), value)) {
        vm.emit(`update:${modelName}`, value);
      }
    },
  );

  watch(
    () => vm.props[modelName] as TValue,
    modelProp => {
      if (!isEqual(modelProp, toValue(model))) {
        onModelPropUpdated?.(modelProp);
      }
    },
  );
}
