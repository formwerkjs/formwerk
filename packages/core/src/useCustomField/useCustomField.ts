import { shallowRef, toValue } from 'vue';
import { FieldTypePrefixes } from '../constants';
import { Reactivify, StandardSchema } from '../types';
import { exposeField, useFormField } from '../useFormField';
import { normalizeProps, propsToValues, useUniqId, useCaptureProps } from '../utils/common';
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

export function useCustomField<TValue = unknown>(_props: Reactivify<CustomFieldProps<TValue>, 'schema'>) {
  const props = normalizeProps(_props, ['schema']);
  const controlId = useUniqId(FieldTypePrefixes.CustomField);
  const controlEl = shallowRef<HTMLInputElement>();
  const field = useFormField<TValue | undefined>({
    label: props.label,
    description: props.description,
    path: props.name,
    initialValue: (toValue(props.modelValue) ?? toValue(props.value)) as TValue | undefined,
    disabled: props.disabled,
    schema: props.schema,
  });

  const { labelledByProps, accessibleErrorProps, describedByProps, isDisabled } = field;
  const { updateValidity } = useInputValidity({ field });

  field.registerControl({
    getControlElement: () => controlEl.value,
    getControlId: () => controlId,
  });

  const controlProps = useCaptureProps(() => {
    return {
      ...propsToValues(props, ['name', 'readonly']),
      ...labelledByProps.value,
      ...describedByProps.value,
      ...accessibleErrorProps.value,
      'aria-readonly': toValue(props.readonly) ? ('true' as const) : undefined,
      'aria-disabled': isDisabled.value ? ('true' as const) : undefined,
      id: controlId,
    };
  }, controlEl);

  if (__DEV__) {
    registerField(field, 'Custom');
  }

  return exposeField(
    {
      /**
       * The id of the control element.
       */
      controlId,

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
