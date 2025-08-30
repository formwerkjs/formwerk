import { MaybeRefOrGetter } from 'vue';

export type Numberish = number | `${number}`;

export type AriaLabelProps = {
  id: string;
  for?: string;
};

export type AriaDescriptionProps = {
  id: string;
};

export type WithId<TProps extends object> = TProps & { id: string };

export type AriaErrorMessageProps = {
  'aria-live': 'polite';
  'aria-atomic': boolean;
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

export type AriaInputProps = {
  'aria-checked'?: boolean;
  'aria-readonly'?: boolean;
  'aria-disabled'?: boolean;
};

export type EventHandler = (e: Event) => void;

export type InputEvents = {
  onInput?: EventHandler;
  onChange?: EventHandler;
  onBlur?: EventHandler;
  onBeforeinput?: EventHandler;
  onInvalid?: EventHandler;
  onKeydown?: (event: KeyboardEvent) => void;
};

export type PressEvents = {
  onClick?: (event: MouseEvent) => void;
};

export type InputBaseAttributes = {
  name?: string;
  readonly?: boolean;
  disabled?: boolean;
};

export interface InputBaseValidationAttributes extends InputBaseAttributes {
  required?: boolean;
}

export interface TextInputBaseAttributes extends InputBaseValidationAttributes {
  name?: string;
  value?: string;
  maxlength?: Numberish;
  minlength?: Numberish;
  pattern?: string;
  placeholder?: string;
}

export type Maybe<T> = T | null | undefined;

export type RovingTabIndex = '0' | '-1';

export type Getter<T> = () => T;

export type Orientation = 'horizontal' | 'vertical';

export type Orientation2D = 'horizontal' | 'vertical' | 'both';

export type Direction = 'ltr' | 'rtl';

export type Reactivify<TProps extends object, Exclude extends keyof TProps = never> = {
  [TProp in keyof TProps]: TProp extends Exclude ? TProps[TProp] : MaybeRefOrGetter<TProps[TProp]>;
};

export type NormalizedProps<TProps extends object, Exclude extends keyof TProps = never> = {
  [TProp in keyof TProps]: TProp extends Exclude
    ? TProps[TProp]
    : TProps[TProp] extends MaybeRefOrGetter<infer TValue>
      ? Getter<TValue>
      : Getter<TProps[TProp]>;
} & {
  __isFwNormalized__: boolean;
};

export type Arrayable<T> = T | T[];

export type FormObject = Record<string, unknown>;

export type MaybeAsync<T> = T | Promise<T>;

export type MaybeGetter<T> = T | Getter<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DangerousAny = any;

export type TransparentWrapper<T> = T;
