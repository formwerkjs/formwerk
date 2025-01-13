import { computed, ComputedRef, MaybeRefOrGetter, toValue } from 'vue';
import { getFromPath } from '../utils/path';
import { isObject } from '../../../shared/src';

export interface CollectionInit<TItem> {
  /**
   * The items to be displayed in the collection.
   */
  items: MaybeRefOrGetter<TItem[]>;
  /**
   * The property to track by, it can be a function that extracts the value from the item. Should be the same as the "value" prop of the option.
   */
  trackBy?: string | ((item: TItem) => unknown);
}

export interface CollectionManager<TItem> {
  items: ComputedRef<TItem[]>;
  trackBy: (item: TItem) => unknown;
}

// TODO: Implement fetching, loading, pagination, adding a new item, etc...
export function defineCollection<TItem>(init: CollectionInit<TItem>): CollectionManager<TItem> {
  const { items, trackBy } = init;

  return {
    items: computed(() => toValue(items)),
    trackBy:
      typeof trackBy === 'function'
        ? trackBy
        : item => {
            if (trackBy && isObject(item)) {
              return getFromPath(item, trackBy, item);
            }

            return item;
          },
  };
}
