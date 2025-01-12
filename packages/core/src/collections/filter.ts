import { isObject } from '../../../shared/src';

export interface FilterFn<TItem> {
  (item: TItem, search: string): boolean;
}

export interface FilterOptions {
  caseSensitive?: boolean;
}

function enumerateValues(obj: unknown): string[] {
  if (typeof obj === 'string' || typeof obj === 'number') {
    return [String(obj)];
  }

  if (!isObject(obj)) {
    return [];
  }

  return Object.entries(obj).flatMap(([, value]) => {
    if (isObject(value)) {
      return enumerateValues(value);
    }

    return [String(value)];
  });
}

export function defineCollectionFilter<TItem>(options: FilterOptions = {}) {
  const { caseSensitive = false } = options;

  const withCaseSensitive = caseSensitive ? (value: string) => value : (value: string) => value.toLowerCase();

  const contains: FilterFn<TItem> = (item, search) => {
    return enumerateValues(item).some(value => withCaseSensitive(value).includes(withCaseSensitive(search)));
  };

  const startsWith: FilterFn<TItem> = (item, search) => {
    return enumerateValues(item).some(value => withCaseSensitive(value).startsWith(withCaseSensitive(search)));
  };

  const endsWith: FilterFn<TItem> = (item, search) => {
    return enumerateValues(item).some(value => withCaseSensitive(value).endsWith(withCaseSensitive(search)));
  };

  const equals: FilterFn<TItem> = (item, search) => {
    return enumerateValues(item).some(value => withCaseSensitive(value) === withCaseSensitive(search));
  };

  return {
    contains,
    startsWith,
    endsWith,
    equals,
  };
}
