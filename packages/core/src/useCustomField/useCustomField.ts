import { computed, Ref, shallowRef, toValue } from 'vue';
import { FieldTypePrefixes } from '../constants';
import { Reactivify, StandardSchema } from '../types';
import { exposeField, useFormField } from '../useFormField';
import { createDescribedByProps, normalizeProps, propsToValues, useUniqId, withRefCapture } from '../utils/common';
import { useLabel, useErrorMessage } from '../a11y';
import { useInputValidity } from '../validation';
import { registerField } from '@formwerk/devtools';

export interface CustomFieldProps<TValue = unknown> {
  /**
   * The label of the field.
   */
  label: string;

  /**
   * The v-model value of the field.
   */
  modelValue?: TValue | undefined;

  /**
   * Description text that provides additional context about the field.
   */
  description?: string;

  /**
   * The name attribute of the input element.
   */
  name?: string;

  /**
   * The initial static value of the field.
   */
  value?: TValue | undefined;

  /**
   * Whether the field is readonly.
   */
  readonly?: boolean;

  /**
   * Whether the field is disabled.
   */
  disabled?: boolean;

  /**
   * Schema for field validation.
   */
  schema?: StandardSchema<TValue>;
}

export function useCustomField<TValue = unknown>(
  _props: Reactivify<CustomFieldProps<TValue>, 'schema'>,
  elementRef?: Ref<HTMLInputElement>,
) {
  const props = normalizeProps(_props, ['schema']);
  const controlId = useUniqId(FieldTypePrefixes.CustomField);
  const controlEl = elementRef || shallowRef<HTMLInputElement>();
  const field = useFormField<TValue | undefined>({
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as TValue | undefined,
    disabled: props.disabled,
    schema: props.schema,
  });

  const { errorMessage, isDisabled } = field;
  const { updateValidity } = useInputValidity({ field });

  const { labelProps, labelledByProps } = useLabel({
    for: controlId,
    label: props.label,
    targetRef: controlEl,
  });

  const { descriptionProps, describedByProps } = createDescribedByProps({
    inputId: controlId,
    description: props.description,
  });

  const { accessibleErrorProps, errorMessageProps } = useErrorMessage({
    inputId: controlId,
    errorMessage,
  });

  const controlProps = computed(() =>
    withRefCapture(
      {
        ...propsToValues(props, ['name', 'readonly']),
        ...labelledByProps.value,
        ...describedByProps.value,
        ...accessibleErrorProps.value,
        'aria-readonly': toValue(props.readonly) ? ('true' as const) : undefined,
        'aria-disabled': isDisabled.value ? ('true' as const) : undefined,
        id: controlId,
      },
      controlEl,
      elementRef,
    ),
  );

  if (__DEV__) {
    registerField(field, 'Custom');
  }

  return exposeField(
    {
      /**
       * Props for the label element.
       */
      labelProps,
      /**
       * Props for the description element.
       */
      descriptionProps,
      /**
       * Props for the error message element.
       */
      errorMessageProps,
      /**
       * Props for the control element/group.
       */
      controlProps,
      /**
       * Validates the field.
       */
      validate: updateValidity,
    },
    field,
  );
}
