import { Ref, shallowRef, toValue } from 'vue';
import { FormObject, MaybeGetter, MaybeAsync, TypedSchema } from '../types';
import { cloneDeep, isPromise } from '../utils/common';

interface FormSnapshotOptions<TForm extends FormObject, TOutput extends FormObject = TForm> {
  onAsyncInit?: (values: TForm) => void;
  schema?: TypedSchema<TForm, TOutput>;
}

export interface FormSnapshot<TForm extends FormObject> {
  initials: Ref<TForm>;
  originals: Ref<TForm>;
}

export function useFormSnapshots<TForm extends FormObject, TOutput extends FormObject = TForm>(
  provider: MaybeGetter<MaybeAsync<TForm>> | undefined,
  opts?: FormSnapshotOptions<TForm, TOutput>,
): FormSnapshot<TForm> {
  // We need two copies of the initial values
  const initials = shallowRef<TForm>({} as TForm) as Ref<TForm>;
  const originals = shallowRef<TForm>({} as TForm) as Ref<TForm>;

  const provided = toValue(provider);
  if (isPromise(provided)) {
    provided.then(resolved => {
      const inits = opts?.schema?.defaults?.(resolved) ?? resolved;
      initials.value = cloneDeep(inits || {}) as TForm;
      originals.value = cloneDeep(inits || {}) as TForm;
      opts?.onAsyncInit?.(cloneDeep(inits));
    });
  } else {
    const inits = opts?.schema?.defaults?.(provided || ({} as TForm)) ?? provided;
    initials.value = cloneDeep(inits || {}) as TForm;
    originals.value = cloneDeep(inits || {}) as TForm;
  }

  return {
    initials,
    originals,
  };
}