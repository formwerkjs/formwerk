export interface FilterContext<TItem> {
  search: string;
  option: {
    label: string;
    item: TItem;
  };
}

export interface FilterFn {
  (context: FilterContext<unknown>): boolean;
}

export interface FilterOptions {
  caseSensitive?: boolean;
}

export function useDefaultFilter(options: FilterOptions = {}) {
  const { caseSensitive = false } = options;

  const withCaseSensitive = caseSensitive ? (value: string) => value : (value: string) => value.toLowerCase();

  const contains: FilterFn = ({ search, option }) => {
    return withCaseSensitive(option.label).includes(withCaseSensitive(search));
  };

  const startsWith: FilterFn = ({ search, option }) => {
    return withCaseSensitive(option.label).startsWith(withCaseSensitive(search));
  };

  const endsWith: FilterFn = ({ search, option }) => {
    return withCaseSensitive(option.label).endsWith(withCaseSensitive(search));
  };

  const equals: FilterFn = ({ search, option }) => {
    return withCaseSensitive(option.label) === withCaseSensitive(search);
  };

  return {
    contains,
    startsWith,
    endsWith,
    equals,
  };
}
