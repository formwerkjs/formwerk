import { computed, inject, InjectionKey, provide, Ref, shallowRef, toValue } from 'vue';
import { ErrorableAttributes, useDescription, useErrorMessage, useLabel } from '../a11y';
import {
  AriaDescribableProps,
  AriaDescriptionProps,
  AriaErrorMessageProps,
  AriaLabelableProps,
  AriaLabelProps,
  Reactivify,
} from '../types';
import { BuiltInControlTypes, ControlApi, ControlProps } from '../types/controls';
import { normalizeProps } from '../utils/common';

export interface FieldControllerProps {
  /**
   * The label of the field.
   */
  label?: string | undefined;

  /**
   * The description of the field.
   */
  description?: string | undefined;

  /**
   * The error message of the field.
   */
  errorMessage?: string | undefined;
}

export interface FieldController {
  /**
   * The label of the field.
   */
  label: Ref<string>;

  /**
   * The id of the control element.
   */
  controlId: Ref<string>;

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

  /**
   * The type of the control, used for devtools.
   */
  controlType: Ref<typeof BuiltInControlTypes | string>;
}

export const FieldControllerKey: InjectionKey<FieldController> = Symbol('FieldControllerKey');

export function useFieldController(_props: Reactivify<FieldControllerProps>): FieldController {
  const control = shallowRef<ControlApi>();
  const props = normalizeProps(_props);
  const getControlId = () => control.value?.getControlId() ?? '';
  const getControlElement = () => control.value?.getControlElement();
  const getControlType = () => control.value?.getControlType() ?? 'Field';

  const { descriptionProps, describedByProps } = useDescription({
    inputId: getControlId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId: getControlId,
    errorMessage: props.errorMessage,
  });

  const { labelProps, labelledByProps } = useLabel({
    label: props.label,
    for: getControlId,
    targetRef: getControlElement,
  });

  function registerControl(api: ControlApi) {
    control.value = api;
  }

  const controlId = computed(() => getControlId());
  const controlType = computed(() => getControlType());

  const controller = {
    label: computed(() => toValue(props.label) ?? ''),
    labelProps,
    controlId,
    controlType,
    labelledByProps,
    descriptionProps,
    describedByProps,
    accessibleErrorProps,
    errorMessageProps,
    registerControl,
  } satisfies FieldController;

  provide(FieldControllerKey, controller);

  return controller;
}

export function useFieldControllerContext<TValue = unknown>(props: Pick<ControlProps<TValue>, '_field'>) {
  return props._field ?? inject(FieldControllerKey, null);
}
