// import { computed, ComputedRef, MaybeRefOrGetter, toValue } from 'vue';
// import { getFromPath } from '../utils/path';
// import { isObject } from '../../../shared/src';

// export interface CollectionInit<TItem> {
//   /**
//    * The items to be displayed in the collection.
//    */
//   items: MaybeRefOrGetter<TItem[]>;
//   /**
//    * The property to track by, it can be a function that extracts the value from the item. Should be the same as the "value" prop of the option.
//    */
//   key?: string | ((item: TItem) => unknown);
// }

// export interface CollectionManager<TItem> {
//   items: ComputedRef<TItem[]>;
//   key: (item: TItem) => unknown;
// }

// // TODO: Implement fetching, loading, pagination, adding a new item, etc...
// export function defineCollection<TItem>(init: CollectionInit<TItem>): CollectionManager<TItem> {
//   const { items, key } = init;

//   return {
//     items: computed(() => toValue(items)),
//     key:
//       typeof key === 'function'
//         ? key
//         : item => {
//             if (key && isObject(item)) {
//               return getFromPath(item, key, item);
//             }

//             return item;
//           },
//   };
// }
