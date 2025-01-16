export interface FilterContext<TValue> {
  search: string;
  option: {
    label: string;
    value: TValue;
  };
}

export interface FilterFn {
  (context: FilterContext<unknown>): boolean;
  debounceMs: number;
}

export interface FilterOptions {
  caseSensitive?: boolean;
  debounceMs?: number;
}

export function useDefaultFilter(options: FilterOptions = {}) {
  const { caseSensitive = false, debounceMs = 0 } = options;

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

  contains.debounceMs = debounceMs;
  startsWith.debounceMs = debounceMs;
  endsWith.debounceMs = debounceMs;
  equals.debounceMs = debounceMs;

  return {
    contains,
    startsWith,
    endsWith,
    equals,
  };
}
