export type Numberish = number | `${number}`;

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
  onKeydown?: (event: KeyboardEvent) => void;
};

export type PressEvents = {
  onClick?: (event: MouseEvent) => void;
};

export type InputBaseAttributes = {
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
