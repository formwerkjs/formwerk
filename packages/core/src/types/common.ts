import { Path } from './path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericObject = Record<string, any>;

export type MaybeArray<T> = T | T[];

export type MaybePromise<T> = T | Promise<T>;

export type FlattenAndSetPathsType<TRecord, TType> = { [K in Path<TRecord>]: TType };

export type AriaLabelProps = {
  id: string;
  for: string;
};

export type AriaDescriptionProps = {
  id: string;
};

export type AriaLabelableProps = {
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

export type AriaDescribableProps = {
  'aria-describedby'?: string;
};

export type AriaValidatableProps = {
  'aria-invalid'?: boolean;
};

export type InputEvents = {
  onInput?: (event: Event) => void;
  onChange?: (event: Event) => void;
  onBlur?: (event: Event) => void;
  onBeforeInput?: (event: Event) => void;
  onInvalid?: (event: Event) => void;
};

export type InputBaseAttributes = {
  required?: boolean;
  readonly?: boolean;
  disabled?: boolean;
};
