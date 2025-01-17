import { useDefaultFilter, type FilterContext } from './filter';

describe('useDefaultFilter', () => {
  const createContext = (search: string, label: string): FilterContext<string> => ({
    search,
    option: {
      label,
      value: label,
    },
  });

  describe('case insensitive (default)', () => {
    const { contains, startsWith, endsWith, equals } = useDefaultFilter();

    it('contains should match substring regardless of case', () => {
      expect(contains(createContext('world', 'Hello World'))).toBe(true);
      expect(contains(createContext('WORLD', 'Hello World'))).toBe(true);
      expect(contains(createContext('world', 'HELLO WORLD'))).toBe(true);
      expect(contains(createContext('xyz', 'Hello World'))).toBe(false);
    });

    it('startsWith should match beginning of string regardless of case', () => {
      expect(startsWith(createContext('hell', 'Hello World'))).toBe(true);
      expect(startsWith(createContext('HELL', 'Hello World'))).toBe(true);
      expect(startsWith(createContext('hell', 'HELLO WORLD'))).toBe(true);
      expect(startsWith(createContext('world', 'Hello World'))).toBe(false);
    });

    it('endsWith should match end of string regardless of case', () => {
      expect(endsWith(createContext('world', 'Hello World'))).toBe(true);
      expect(endsWith(createContext('WORLD', 'Hello World'))).toBe(true);
      expect(endsWith(createContext('world', 'HELLO WORLD'))).toBe(true);
      expect(endsWith(createContext('hello', 'Hello World'))).toBe(false);
    });

    it('equals should match exact string regardless of case', () => {
      expect(equals(createContext('hello world', 'Hello World'))).toBe(true);
      expect(equals(createContext('HELLO WORLD', 'Hello World'))).toBe(true);
      expect(equals(createContext('hello', 'Hello World'))).toBe(false);
    });
  });

  describe('case sensitive', () => {
    const { contains, startsWith, endsWith, equals } = useDefaultFilter({ caseSensitive: true });

    it('contains should match substring with exact case', () => {
      expect(contains(createContext('World', 'Hello World'))).toBe(true);
      expect(contains(createContext('WORLD', 'Hello World'))).toBe(false);
      expect(contains(createContext('world', 'Hello World'))).toBe(false);
    });

    it('startsWith should match beginning of string with exact case', () => {
      expect(startsWith(createContext('Hello', 'Hello World'))).toBe(true);
      expect(startsWith(createContext('HELLO', 'Hello World'))).toBe(false);
      expect(startsWith(createContext('hello', 'Hello World'))).toBe(false);
    });

    it('endsWith should match end of string with exact case', () => {
      expect(endsWith(createContext('World', 'Hello World'))).toBe(true);
      expect(endsWith(createContext('WORLD', 'Hello World'))).toBe(false);
      expect(endsWith(createContext('world', 'Hello World'))).toBe(false);
    });

    it('equals should match exact string with exact case', () => {
      expect(equals(createContext('Hello World', 'Hello World'))).toBe(true);
      expect(equals(createContext('HELLO WORLD', 'Hello World'))).toBe(false);
      expect(equals(createContext('hello world', 'Hello World'))).toBe(false);
    });
  });

  describe('debounce configuration', () => {
    it('should set default debounce to 0', () => {
      const { contains, startsWith, endsWith, equals } = useDefaultFilter();
      expect(contains.debounceMs).toBe(0);
      expect(startsWith.debounceMs).toBe(0);
      expect(endsWith.debounceMs).toBe(0);
      expect(equals.debounceMs).toBe(0);
    });

    it('should set custom debounce value', () => {
      const { contains, startsWith, endsWith, equals } = useDefaultFilter({ debounceMs: 300 });
      expect(contains.debounceMs).toBe(300);
      expect(startsWith.debounceMs).toBe(300);
      expect(endsWith.debounceMs).toBe(300);
      expect(equals.debounceMs).toBe(300);
    });
  });
});
