import Fuse from 'fuse.js';
import { computed, MaybeRefOrGetter, Ref, toValue } from 'vue';

export function useFuzzyList<TItem>(items: MaybeRefOrGetter<TItem[]>, keys: string[], search: Ref<string>) {
  const fuse = computed(() => new Fuse(toValue(items), { keys }));

  const results = computed(() => (search.value ? fuse.value.search(search.value).map(i => i.item) : toValue(items)));

  return results;
}
