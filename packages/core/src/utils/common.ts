import { getCurrentInstance } from 'vue';
import { AriaDescriptionProps, AriaLabelProps } from '../types/common';

export function uniqId() {
  return crypto.randomUUID();
}

// TODO: Make this a proper deep equality check
export function isEqual(lhs: unknown, rhs: unknown) {
  return lhs === rhs;
}

export function createLabelProps(inputId: string): AriaLabelProps {
  return {
    id: `${inputId}-l`,
    for: inputId,
  };
}

export function createDescriptionProps(inputId: string): AriaDescriptionProps {
  return {
    id: `${inputId}-d`,
  };
}

export function createErrorProps(inputId: string): AriaDescriptionProps {
  return {
    id: `${inputId}-r`,
  };
}
