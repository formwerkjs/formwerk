import { OptionRegistration } from '../useListBox';

export interface FilterFn {
  (item: OptionRegistration<unknown>, search: string): boolean;
}

export interface FilterOptions {
  caseSensitive?: boolean;
}

export function defineCollectionFilter(options: FilterOptions = {}) {
  const { caseSensitive = false } = options;

  const withCaseSensitive = caseSensitive ? (value: string) => value : (value: string) => value.toLowerCase();

  const contains: FilterFn = (item, search) => {
    return withCaseSensitive(item.getLabel()).includes(withCaseSensitive(search));
  };

  const startsWith: FilterFn = (item, search) => {
    return withCaseSensitive(item.getLabel()).startsWith(withCaseSensitive(search));
  };

  const endsWith: FilterFn = (item, search) => {
    return withCaseSensitive(item.getLabel()).endsWith(withCaseSensitive(search));
  };

  const equals: FilterFn = (item, search) => {
    return withCaseSensitive(item.getLabel()) === withCaseSensitive(search);
  };

  return {
    contains,
    startsWith,
    endsWith,
    equals,
  };
}
