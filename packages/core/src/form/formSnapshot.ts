import { Ref, shallowRef, toValue } from 'vue';
import { FormObject, MaybeGetter, MaybeAsync } from '../types';
import { cloneDeep, isPromise } from '../utils/common';

interface FormSnapshotOptions<TForm extends FormObject> {
  onAsyncInit?: (values: TForm) => void;
}

export interface FormSnapshot<TForm extends FormObject> {
  initials: Ref<TForm>;
  originals: Ref<TForm>;
}

export function useFormSnapshots<TForm extends FormObject>(
  provider: MaybeGetter<MaybeAsync<TForm>> | undefined,
  opts?: FormSnapshotOptions<TForm>,
): FormSnapshot<TForm> {
  // We need two copies of the initial values
  const initials = shallowRef<TForm>({} as TForm) as Ref<TForm>;
  const originals = shallowRef<TForm>({} as TForm) as Ref<TForm>;

  const initialValuesUnref = toValue(provider);
  if (isPromise(initialValuesUnref)) {
    initialValuesUnref.then(inits => {
      initials.value = cloneDeep(inits || {}) as TForm;
      originals.value = cloneDeep(inits || {}) as TForm;
      opts?.onAsyncInit?.(cloneDeep(inits));
    });
  } else {
    initials.value = cloneDeep(initialValuesUnref || {}) as TForm;
    originals.value = cloneDeep(initialValuesUnref || {}) as TForm;
  }

  return {
    initials,
    originals,
  };
}
