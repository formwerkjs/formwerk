import { computed, ComputedRef, MaybeRefOrGetter, Ref, toValue } from 'vue';
import { FilterFn } from './filter';

export interface CollectionInit<TItem> {
  filter?: FilterFn<TItem>;
  items: MaybeRefOrGetter<TItem[]>;
}

export interface CollectionManager<TItem> {
  items: ComputedRef<TItem[]>;
}

export type CollectionFactory<TItem> = (search: Ref<string>) => CollectionManager<TItem>;

// TODO: Implement fetching, loading, pagination, adding a new item, etc...
export function defineCollection<TItem>(init: CollectionInit<TItem>): CollectionFactory<TItem> {
  const { items, filter } = init;

  return search => {
    return {
      items: computed(() => toValue(items).filter(item => filter?.(item, search.value) ?? true)),
    };
  };
}
