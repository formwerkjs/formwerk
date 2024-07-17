import { MaybeRefOrGetter, Ref, ref, toValue } from 'vue';

export function useFieldValue<TValue = unknown>(initial?: MaybeRefOrGetter<TValue>) {
  const fieldValue = ref(toValue(initial ?? undefined)) as Ref<TValue | undefined>;

  return {
    fieldValue,
  };
}
