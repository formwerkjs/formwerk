import { inject, InjectionKey, provide, Ref, shallowRef } from 'vue';
import { ErrorableAttributes, useDescription, useErrorMessage, useLabel } from '../a11y';
import {
  AriaDescribableProps,
  AriaDescriptionProps,
  AriaErrorMessageProps,
  AriaLabelableProps,
  AriaLabelProps,
  Reactivify,
} from '../types';
import { ControlApi } from '../types/controls';
import { FieldState } from '../useFieldState';

interface FieldProps {
  /**
   * The label of the field.
   */
  label: string;

  /**
   * The description of the field.
   */
  description?: string;
}

export interface FormField {
  /**
   * Props for the label element.
   */
  labelProps: Ref<AriaLabelProps>;

  /**
   * Props for the element to be labelled.
   */
  labelledByProps: Ref<AriaLabelableProps>;

  /**
   * Props for the description element.
   */
  descriptionProps: Ref<AriaDescriptionProps>;

  /**
   * Props for the element to be described.
   */
  describedByProps: Ref<AriaDescribableProps>;

  /**
   * Props for the error message element.
   */
  errorMessageProps: Ref<AriaErrorMessageProps>;

  /**
   * Props for the element associated with an error.
   */
  accessibleErrorProps: Ref<ErrorableAttributes>;

  /**
   * Registers a control interface, used to get the control element and id.
   */
  registerControl: (control: ControlApi) => void;
}

export const FormFieldKey: InjectionKey<FormField> = Symbol('FormFieldKey');

// oxlint-disable-next-line no-explicit-any
export function useFormField(props: Reactivify<FieldProps>, state: FieldState<any>): FormField {
  const control = shallowRef<ControlApi>();
  const getControlId = () => control.value?.getControlId() ?? '';

  const { descriptionProps, describedByProps } = useDescription({
    inputId: getControlId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId: getControlId,
    errorMessage: state.errorMessage,
  });

  const { labelProps, labelledByProps } = useLabel({
    label: props.label,
    for: getControlId,
    targetRef: () => control.value?.getControlElement(),
  });

  function registerControl(api: ControlApi) {
    control.value = api;
  }

  const field = {
    labelProps,
    labelledByProps,
    descriptionProps,
    describedByProps,
    accessibleErrorProps,
    errorMessageProps,
    registerControl,
  } satisfies FormField;

  provide(FormFieldKey, field);

  return field;
}

/**
 * Returns the registerControl function, used to register a control and hook the labels and descriptions.
 */
export function useFormFieldInjection() {
  return inject(FormFieldKey, null);
}
